#!/bin/bash

# This is meant to be used on OS X only.

executableDirectory="$(cd "${0%/*}" 2>/dev/null; echo "$PWD"/"${0##*/}")"
executableDirectory=`dirname "$executableDirectory"`

# Launch it
exec "$executableDirectory/builds/osx/node" "$executableDirectory/CacheServer.js" $@
