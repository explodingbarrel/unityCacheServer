#!/usr/bin/env bash

# create log
sudo touch /var/log/unity/unityCacheServer.log

# setup logrotate
sudo cp -v -f config/unityCacheServer /etc/logrotate.d/

# create cache location
sudo mkdir -v -p /data/cache5.0

# create new unity user
sudo useradd -M unity
sudo usermod -L unity

# change ownership of log
sudo chown unity /var/log/unity
sudo chown unity /var/log/unity/unityCacheServer.log
sudo chown unity /data/cache5.0
