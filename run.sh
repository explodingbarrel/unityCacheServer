#!/usr/bin/env bash
killall node
export PATH=/home/william/.nvm/versions/node/v8.1.4/bin:$PATH
unity-cache-server -P /data/cache5.0/ -l 5 > /var/log/unity/unityCacheServer.log 2>&1 &