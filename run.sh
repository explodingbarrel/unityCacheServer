#!/usr/bin/env bash
killall node
./RunLinux.sh --path /data/cache5.0 --legacypath /data/legacy --size 100000000000 --nolegacy --iplist '10\.(210\.0\.[6|7][0-9]|211\.60\.16)' > /var/log/unityCacheServer.log 2>&1
