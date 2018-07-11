#!/usr/bin/env bash
killall node
#the -l flag is for level 5 logging aka debug logging todo get rid of this for prod.
unity-cache-server -P /data/cache5.0 -l 5 > /var/log/unity/unityCacheServer.log 2>&1 &
#./RunLinux.sh --path /data/cache5.0 --legacypath /data/legacy --size 100000000000 --nolegacy --iplist '10\.(210\.0\.[6|7][0-9]|211\.0\.(176|119))' > /var/log/unityCacheServer.log 2>&1
#./RunLinux.sh --path /data/cache5.0 --legacypath /data/legacy --size 100000000000 --nolegacy > /var/log/unityCacheServer.log 2>&1
