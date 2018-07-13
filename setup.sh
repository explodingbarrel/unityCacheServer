#!/usr/bin/env bash

# create log
sudo touch /var/log/unity/unityCacheServer.log

# setup logrotate
sudo cp -v -f config/unityCacheServer /etc/logrotate.d/

# create cache location
sudo mkdir -v -p /data/cache5.0

# change ownership of log
sudo chown $1 /var/log/unity/unityCacheServer.log
sudo chown $1 /data/cache5.0

# setup init.d service file to /etc/init.d/
sudo cp -v -f config/unityCacheServer.sh /etc/init.d/
sudo chmod 755 /etc/init.d/
sudo update-rc.d unityCacheServer.sh defaults
