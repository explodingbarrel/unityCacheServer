#!/usr/bin/env bash
echo $PATH
echo nvm_dir = $NVM_DIR
killall node
unity-cache-server -P /data/cache5.0/ -l 5 > /var/log/unity/unityCacheServer.log 2>&1 &
