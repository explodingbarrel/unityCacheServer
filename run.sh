#!/usr/bin/env bash
killall node
unity-cache-server -P /data/cache5.0/ > /var/log/unity/unityCacheServer.log 2>&1 &