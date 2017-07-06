#!/bin/bash

executableDirectory="$(cd "${0%/*}" 2>/dev/null; echo "$PWD"/"${0##*/}")"
executableDirectory=`readlink --canonicalize "$executableDirectory"`
executableDirectory=`dirname "$executableDirectory"`
jsDirectory="$executableDirectory"

node="$executableDirectory/nodejs/linux64/bin/node"

# If node doesn't exist in the current directory,
# fall back to system-installed version
if ! test -x "$node"; then
    node='/usr/bin/node'
    if ! test -x "$node"; then
        node='/usr/bin/nodejs'
    fi
fi

# Launch it
echo "$node" "$jsDirectory/main.js" $@
nohup "$node" "$jsDirectory/main.js" $@
