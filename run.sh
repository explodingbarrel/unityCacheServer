#!/usr/bin/env bash
killall node

unity-cache-server -P /data/cache5.0/ -l 5 > /var/log/unity/unityCacheServer.log 2>&1 &