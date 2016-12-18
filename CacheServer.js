var net = require('net');
var fs = require('fs');
var path = require('path');
var buffers = require('buffer');
var assert = require('assert');

var cacheDir = "cache";
var PROTOCOL_VERSION = 255;

//
function d2h(d) {return d.toString(16);}
function h2d(h) {return parseInt(h,16);}

// Little endian
function readUInt32(data)
{
    return h2d(data.toString('ascii', 0, 8));
}

function writeUInt32(indata, outbuf)
{
    var str = d2h(indata);
    for (var i = 8 - str.length; i > 0; i--) {
	str = '0' + str;
    }
    outbuf.write(str, 0, 'ascii');
}

// All numbers in js is 64 floats which means
// man 2^52 is the max integer size that does not
// use the exponent. This should not be a problem.
function readUInt64(data)
{
    return h2d(data.toString('ascii', 0, 16));
}

function writeUInt64(indata, outbuf)
{
    var str = d2h(indata);
    for (var i = 16 - str.length; i > 0; i--) {
	str = '0' + str;
    }
    outbuf.write(str, 0, 'ascii');
}

function readHex(len, data)
{
    var res = '';
    var tmp;
    for (var i = 0; i < len; i++) {
	tmp = data[i];
	res += tmp < 0x10 ? '0' + tmp.toString(16) : tmp.toString(16);
    }
    return res;
}

function uuid()
{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
														  var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
														  return v.toString(16);
														  });
};

var LOG_LEVEL = 10;
var ERR  = 2;
var WARN = 4;
var INFO = 5;
var DBG = 6;

function log(lvl, msg)
{
    if (LOG_LEVEL < lvl)
		return;
    console.log(msg);
}

var CMD_GET = 'g'.charCodeAt(0);
var CMD_PUT = 'p'.charCodeAt(0);
var CMD_GETOK  = '+'.charCodeAt(0);
var CMD_GETNOK = '-'.charCodeAt(0);

var UINT_SIZE = 8;			// hex encoded
var LEN_SIZE = 16;			// hex 
var HASH_SIZE = 16;			// bin
var GUID_SIZE = 16;			// bin
var ID_SIZE = GUID_SIZE + HASH_SIZE;	// bin
var CMD_SIZE = 1;			// bin

var gTotalDataSize = -1;
var maxCacheSize = 1024 * 1024 * 1024 * 50;
var freeCacheSizeRatio = 0.9;
var freeCacheSizeRatioWriteFailure = 0.8;

var gFreeingSpaceLock = 0;


var maximumHeapSocketBufferSize = 1024 * 1024 * 25;

function WalkDirectory (dir, done)
{
	var results = [];
	fs.readdir(dir, function(err, list)
	{
		if (err)
			return done(err);
			   
		var pending = list.length;
		if (pending == 0)
			done (null, results);
		else
		{
			list.forEach(function(file)
			{
				file = dir + '/' + file;
				fs.stat(file, function(err, stat)
				{
					if (!err && stat)
					{
						if (stat.isDirectory())
						{
							WalkDirectory(file, function(err, res)
							{
								results = results.concat(res);
								if (!--pending)
									done(null, results);
							});
						}
						else
						{
							results.push({ name : file, date : stat.mtime, size : stat.size });
							if (!--pending) 
								done(null, results);
						}
					}
					else
					{
						log(DBG, "Freeing space failed to extract stat from file.");
					}
				});
			});
		}
	});
}


function FreeSpaceOfFile (removeParam)
{
	LockFreeSpace();

	fs.unlink (removeParam.name, function (err)
	{
		if (err)
		{
			log(DBG, "Freeing cache space file can not be accessed: " + removeParam.name + err);
			
			// If removing the file fails, then we have to adjust the total data size back
			gTotalDataSize += removeParam.size;
		}
		else
		{
			log(DBG, "  Did remove: " + removeParam.name + ". ("  + removeParam.size + ")");
		}
			
		UnlockFreeSpace ();
	});
}

function FreeSpace (freeSize)
{
	if (gFreeingSpaceLock != 0)
	{
		log(DBG, "Skip free cache space because it is already in progress: " + gFreeingSpaceLock);
		return;
	}	

	LockFreeSpace();
	
	log(DBG, "Begin freeing cache space. Current size: " + gTotalDataSize);

	WalkDirectory (cacheDir, function (err, files)
	{
		if (err)
			throw err;
				   
		files.sort ( function (a, b)
		{
			if (a.date == b.date)
				return 0;
			else if (a.date < b.date)
				return 1;
			else
				return -1;
		});
		
		while (gTotalDataSize > freeSize)
		{
			var remove = files.pop();
			if (!remove)
				break;
			
			gTotalDataSize -= remove.size;
			FreeSpaceOfFile (remove);
		}		
		
		UnlockFreeSpace ();
	});
}

function LockFreeSpace ()
{
	gFreeingSpaceLock++;
}

function UnlockFreeSpace ()
{
	gFreeingSpaceLock--;
	if (gFreeingSpaceLock == 0)
	{
		log(DBG, "Completed freeing cache space. Current size: " + gTotalDataSize);
	}
}


function GetDirectorySize (dir)
{
	size = 0;
	fs.readdirSync(dir).forEach( function (file)
	{
		file = dir + "/" + file;
		var stats = fs.statSync(file);
		if (stats.isFile())
			size += stats.size;
		else
			size += GetDirectorySize(file);
	});
	return size;
}

// To make sure we are not working on a directory which is not cache data, and we delete all the files in it
// during LRU.
function CheckCacheDirectory (dir)
{
	size = 0;
	fs.readdirSync(dir).forEach( function (file)
	{
		if (file.length > 2 && file.indexOf("Temp") != 0 && file != ".DS_Store")
		{
			throw new Error ("The file "+dir+"/"+file+" does not seem to be a valid cache file. Please delete it or choose another cache directory.");
		}
	});
}

function InitCache ()
{
	if (!path.existsSync(cacheDir))
		fs.mkdirSync (cacheDir, 0777);
	CheckCacheDirectory (cacheDir);
	gTotalDataSize = GetDirectorySize (cacheDir);

	log(DBG, "cache directory " + path.resolve(cacheDir));
	log(DBG, "cache size " + gTotalDataSize);
	log(DBG, "max cache size " + maxCacheSize);
	
	if (gTotalDataSize > maxCacheSize)
		FreeSpace (GetFreeCacheSize ());
}

function AddFileToCache (bytes)
{
	gTotalDataSize += bytes;
	log(DBG, "Total Cache Size " + gTotalDataSize);
	
	if (gTotalDataSize > maxCacheSize)
		FreeSpace (GetFreeCacheSize ());
}

function GetFreeCacheSize ()
{
	return freeCacheSizeRatio * maxCacheSize;
}

function GetCachePath (guid, hash, create)
{
	var dir = cacheDir + "/" + hash.substring(0, 2);
	if (create)
		fs.mkdir (dir, 0777);
	return dir +"/"+ guid + "-" + hash;
}
/*
Protocol
========

client --- (version <uint32>) --> server      (using version)
client <-- (version <uint32>) --- server      (echo version if supported or 0)

# request cached item
client --- 'g' (id <128bit GUID><128bit HASH>) --> server
client <-- '+' (size <uint64>) (id <128bit GUID><128bit HASH>) + size bytes  --- server    (found in cache)
client <-- '-' (id <128bit GUID><128bit HASH>) --- server    (not found in cache)

# put cached item
client  -- 'p' size <uint64> id <128bit GUID><128bit HASH> + size bytes --> server

*/

function handleData (socket, data)
{
	// There is pending data, add it to the data buffer
	if (socket.pendingData != null)
	{
		var buf = new Buffer (data.length + socket.pendingData.length);
		socket.pendingData.copy (buf, 0, 0);
		data.copy (buf, socket.pendingData.length, 0);
		data = buf;
		socket.pendingData = null;
	}

	while (true)
	{
		assert(socket.pendingData == null, "pending data must be null")

		if (data.length > maximumHeapSocketBufferSize * 2)
		{
			var sizeMB = data.length / (1024 * 1024);
			log(DBG, "incoming data exceeds buffer limit " + sizeMB + " mb.");				
		}
		
		// Get the version as the first thing
		var idx = 0;
		if (!socket.protocolVersion) 
		{
			socket.protocolVersion = readUInt32(data);
			console.log("Client protocol version", socket.protocolVersion);
			var buf = new buffers.Buffer(UINT_SIZE);
			if (socket.protocolVersion == PROTOCOL_VERSION)
			{
				writeUInt32(socket.protocolVersion, buf);
				socket.write(buf);
				idx += UINT_SIZE;
			}
			else
			{
				writeUInt32(0, buf);
				socket.write(buf);
				socket.end();
				return;
			}
		}
		
		// Write a a file to a temp location and move it in place when it has completed
		if (socket.activePutFile != null)
		{
			var size = data.length;
			if (socket.bytesToBeWritten < size)
				size = socket.bytesToBeWritten;
			socket.activePutFile.write (data.slice(0, size), "binary");
			socket.bytesToBeWritten -= size;
			
			// If we have written all data for this file. We can close the file.
			if (socket.bytesToBeWritten <= 0)
			{
				socket.activePutFile.on('close', function()
				{
					fs.stat(socket.activePutTarget, function (statsErr, stats)
					{
						// We are replacing a file, we need to subtract this from the totalFileSize
						var size = 0;
						if (!statsErr && stats)
						{
							size = stats.size;
						}
						
						fs.rename(socket.tempPath, socket.activePutTarget, function (err)
						{
							if (err)
							{
								log(DBG, "Failed to move file in place " + socket.tempPath + " to " + socket.activePutTarget + err);				
								fs.unlink(socket.tempPath);
							}
							else
							{
								AddFileToCache (socket.totalFileSize - size);
							}
							
							socket.tempPath = null;
							socket.activePutTarget = null;
							socket.totalFileSize = 0;

							if (socket.isPaused)
								  socket.resume();
						});
					});
				});
				
				socket.activePutFile.end();
				socket.activePutFile.destroySoon();
				socket.activePutFile = null;
				
				data = data.slice(size);
				continue;
			}
			// We need more data to write the file completely
			// Return and wait for the next call to handleData to receive more data.
			else
			{
				return;
			}
		}
		//  Serve a file from the cache server to the client
		else if (data[idx] == CMD_GET)
		{
			///@TODO: What does this do?
			if (data.length < CMD_SIZE + ID_SIZE)
			{
				socket.pendingData = data;
				return;
			}
			idx += 1;
			var guid = readHex(GUID_SIZE, data.slice(idx));
			var hash = readHex(HASH_SIZE, data.slice(idx+GUID_SIZE));
			log(DBG, "Get " + guid + "_" + hash);
			
			var resbuf = new buffers.Buffer(CMD_SIZE + LEN_SIZE + ID_SIZE);
			data.copy(resbuf, CMD_SIZE + LEN_SIZE, idx, idx + ID_SIZE); // copy guid+hash
			
			socket.getFileQueue.unshift( { buffer : resbuf, cacheStream : GetCachePath(guid, hash, false) } );
			
			if (!socket.activeGetFile)
			{
				sendNextGetFile(socket);
			}
			
			data = data.slice(idx+GUID_SIZE+HASH_SIZE);
			continue;
		}
		// Put a file from the client to the cache server
		else if (data[idx] == CMD_PUT)
		{ 
			/// * We don't have enough data to start the put request. (wait for more data)
			if (data.length < CMD_SIZE + LEN_SIZE + ID_SIZE)
			{
				socket.pendingData = data;
				return;
			}

			// We have not completed writing the previous file
			if (socket.activePutTarget != null)
			{
				// If we are using excessive amounts of memory
				if (data.length > maximumHeapSocketBufferSize)
				{
					var sizeMB = data.length / (1024 * 1024);
					log(DBG, "Pausing socket for in progress file to be written in order to keep memory usage low... " + sizeMB + " mb");				
					socket.isPaused = true;
					socket.pause();
				}

				// Keep the data in pending for the next handleData call
				socket.pendingData = data;
				
				return;
			}
			
			idx += 1;
			var size = readUInt64(data.slice(idx));
			var guid = readHex(GUID_SIZE, data.slice(idx+LEN_SIZE));
			var hash = readHex(HASH_SIZE, data.slice(idx+LEN_SIZE+GUID_SIZE));
			log(DBG, "PUT " + guid + "_" + hash + " (size " + size + ")");
			
			socket.activePutTarget = GetCachePath(guid, hash, true);
			socket.tempPath = cacheDir + "/Temp"+uuid();
			socket.activePutFile = fs.createWriteStream(socket.tempPath);			
			
			socket.activePutFile.on ('error', function(err)
			{
				 // Test that this codepath works correctly
				 log(ERR, "Error writing to file " + err + ". Possibly the disk is full? Please adjust --cacheSize with a more accurate maximum cache size");
				 FreeSpace (gTotalDataSize * freeCacheSizeRatioWriteFailure);
				 socket.destroy();
				 return;
			});
			socket.bytesToBeWritten = size;
			socket.totalFileSize = size;
			
			data = data.slice(idx+LEN_SIZE+GUID_SIZE+HASH_SIZE);
			continue;
		}
		
		// We need more data to write the file completely
		return;
	}
}

var server = net.createServer(function (socket)
{
	socket.getFileQueue = [];
	socket.protocolVersion = null;
	socket.activePutFile = null;
	socket.activeGetFile = null;
	socket.pendingData = null;
	socket.bytesToBeWritten = 0;
	socket.totalFileSize = 0;
	socket.isPaused = 0;
	socket.on('data', function (data)
	{
		handleData (socket, data);
	});
	socket.on('error', function (err)
	{
		log(ERR, "Socket error " + err);
	});
});

function sendNextGetFile(socket)
{
    if (socket.getFileQueue.length == 0)
	{
	    socket.activeGetFile = null;
		return;
    }
    var next = socket.getFileQueue.pop();
    var resbuf = next.buffer;
    var file = fs.createReadStream(next.cacheStream);
    // make sure no data is read and lost before we have called file.pipe().
    file.pause();
    socket.activeGetFile = file;
    var errfunc = function(err)
	{
		var buf = new buffers.Buffer(CMD_SIZE+ID_SIZE);
		buf[0] = CMD_GETNOK;
		var id_offset = CMD_SIZE + LEN_SIZE;
		resbuf.copy(buf, 1, id_offset, id_offset + ID_SIZE);
		try
		{
			socket.write(buf);
		}
		catch (err)
		{
			log(ERR, "Error sending file data to socket " + err);
		};
		sendNextGetFile(socket);
		log(INFO, "not found: "+next.cacheStream);
    }

	file.on ('close', function()
	{
		sendNextGetFile(socket);
	});
    
	file.on('open', function(fd)
	{
	    fs.fstat(fd, function(err, stats)
		{
		    if (err) 
				errfunc(err);
			else
			{
				resbuf[0] = CMD_GETOK;
				writeUInt64(stats.size, resbuf.slice(1));
				log(INFO, "found: "+next.cacheStream + " size:" + stats.size);
		
				// The ID is already written
				try
				{
					socket.write(resbuf);
					file.resume();
					file.pipe(socket, { end: false });
				}
				catch (err)
				{
					log(ERR, "Error sending file data to socket " + err);
				};
			}
		});
    });

   file.on('error', errfunc);
}

function ParseArguments ()
{
	for (i = 2; i<process.argv.length; i++)
	{
		arg = process.argv[i];
		
		if (arg.indexOf("--size") == 0)
		{
			val = process.argv[++i];
			maxCacheSize = parseInt(val);
		}
		else if (arg.indexOf("--path") == 0)
		{
			val = process.argv[++i];
			cacheDir = val;
		}
		
		if (arg.indexOf("--help") == 0)
		{
			log(INFO, "Usage: node CacheServer.js [--path pathToCache] [--size maximumSizeOfCache] \n--path: to specify the path of the cache directory\n--size to specify the maximum allowed size of the LRU cache. Files that have not been used recently will automatically be discarded when the cache size is exceeded.");
			process.exit(0);
		}
	}
}

ParseArguments ();
InitCache ();
server.listen(8125);

log(INFO, "Cache Server on port 8125");
// Inform integration tests that the cache server is ready
log(INFO, "Cache Server is ready");