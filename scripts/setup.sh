#!/bin/bash

sudo touch /var/log/unityCacheServer.log
sudo cp -f /opt/unityCacheServer/config/unityCacheServer /etc/logrotate.d/
sudo cp -f /opt/unityCacheServer/config/unityCacheServer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start unityCacheServer
sudo systemctl enable unityCacheServer
