#!/bin/bash

sudo systemctl disable unityCacheServer
sudo systemctl stop unityCacheServer

sudo mkdir /var/log/unity/
sudo touch /var/log/unity/unityCacheServer.log
sudo chown unity /var/log/unity
sudo chgrp unity /var/log/unity
sudo chown unity /var/log/unity/unityCacheServer.log
sudo chgrp unity /var/log/unity/unityCacheServer.log
sudo rm /etc/logrotate.d/unityCacheServer.logrotate
sudo cp /opt/unityCacheServer/config/unityCacheServer.logrotate /etc/logrotate.d/unityCacheServer.logrotate
sudo ln -s /opt/unityCacheServer/config/unityCacheServer.service /etc/systemd/system/unityCacheServer.service

sudo systemctl daemon-reload
sudo systemctl start unityCacheServer
sudo systemctl enable unityCacheServer
