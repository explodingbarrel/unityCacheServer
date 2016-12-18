#!/bin/bash

executableDirectory="$(cd "${0%/*}" 2>/dev/null; echo "$PWD"/"${0##*/}")"
executableDirectory=`readlink --canonicalize "$executableDirectory"`
executableDirectory=`dirname "$executableDirectory"`
jsDirectory="$executableDirectory"

# Check for arch-independent install
MACHINE_TYPE=`uname -m`
if test ${MACHINE_TYPE} = 'x86_64'; then
	executableDirectory="$executableDirectory/builds/linux64"
else
	executableDirectory="$executableDirectory/builds/linux32"
fi
node="$executableDirectory/node"

# If node doesn't exist in the current directory, 
# fall back to system-installed version
if ! test -x "$node"; then
	node='/usr/bin/node'
	if ! test -x "$node"; then
		node='/usr/bin/nodejs'
	fi
fi

# Launch it
exec "$node" "$jsDirectory/CacheServer.js" $@
