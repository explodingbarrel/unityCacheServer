#!/bin/sh

#export NODE_PATH=/usr/lib/node_modules
cd /opt/unityCacheServer
npm install .

basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")

case `uname` in
    *CYGWIN*) basedir=`cygpath -w "$basedir"`;;
esac

if [ -x "$basedir/node" ]; then
  "$basedir/node"  "/opt/unityCacheServer/main.js" "$@" > /var/log/unityCacheServer.log 2>&1
  ret=$?
else
  node  "/opt/unityCacheServer/main.js" "$@" > /var/log/unityCacheServer.log 2>&1
  ret=$?
fi
exit $ret
