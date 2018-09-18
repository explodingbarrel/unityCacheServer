#!/bin/bash

sudo systemctl disable unityCacheServer
sudo systemctl stop unityCacheServer
sudo mkdir /var/log/unity/
sudo touch /var/log/unity/unityCacheServer.log
sudo groupadd unitycache
sudo useradd -MG unity unity
sudo usermod -L unity
sudo chown unity /var/log/unity
sudo chgrp unity /var/log/unity
sudo chown unity /var/log/unity/unityCacheServer.log
sudo chgrp unity /var/log/unity/unityCacheServer.log
sudo cp -f /opt/unityCacheServer/config/unityCacheServer /etc/logrotate.d/
sudo cp -f /opt/unityCacheServer/config/unityCacheServer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start unityCacheServer
sudo systemctl enable unityCacheServer