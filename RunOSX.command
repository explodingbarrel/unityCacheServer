#!/bin/bash

# This is meant to be used on OS X only.

executableDirectory="$(cd "${0%/*}" 2>/dev/null; echo "$PWD"/"${0##*/}")"
executableDirectory=`dirname "$executableDirectory"`

# Launch it
echo exec "$executableDirectory/nodejs/osx/bin/node" "$executableDirectory/main.js" "$@"
exec "$executableDirectory/nodejs/osx/bin/node" "$executableDirectory/main.js" "$@"
