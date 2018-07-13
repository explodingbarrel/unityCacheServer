#!/bin/bash

### BEGIN INIT INFO
# Provides: unity_cache_server
# Required-Start: $network $remote_fs
# Required-Stop: $network $remote_fs
# Default-Start: 2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: Unity Cache Server.
# Description: Unity Cache Server provides fast importing
# of assets that have already been processed by any member of the team.
### END INIT INFO

if [ -f /etc/init.d/functions ] ; then
# Source function library.
. /etc/init.d/functions
else
echo_success () { echo -n " [ OK ] " ; }
echo_failure () { echo -n " [FAILED] " ; }
fi

if [ -f /etc/sysconfig/network ] ; then
# Source networking configuration.
. /etc/sysconfig/network

# Check that networking is up.
[ X\${NETWORKING} = Xno ] exit 0

fi

##
# UnityCacheServer startup script
##

################################################################################
## EDIT FROM HERE
################################################################################

# Installation prefix
# todo wchow change this to what is needed on the cache server.
CSUSER="william"
# The path that is to be used for the script
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/home/william/.nvm/versions/node/v8.1.4/bin
################################################################################
## STOP EDITING HERE
################################################################################

# The path that is to be used for the script
RETVAL=0

dostatus() {
echo -n "Status: "
pid=`ps ax | grep bin/unity-cache-server | grep -v grep | awk '{print $1}'`
if [ -n "$pid" ]; then
echo -n "running"
else
echo -n "stopped"
fi
echo
}

start () {
echo -n $"Starting Unity Cache Server: "
/sbin/runuser $CSUSER -s /bin/bash -c "unity-cache-server -P /data/cache5.0 -l 5 > /var/log/unity/unityCacheServer.log 2>&1 &"
RETVAL=$?
if [ $RETVAL -eq 0 ]; then
echo_success
dostatus
echo
else
echo_failure
dostatus
echo
exit 1
fi
}

stop () {
echo -n $"Stopping Unity Cache Server: "
/sbin/runuser $CSUSER -s /bin/bash -c "kill $(ps ax | grep unity-cache-server | grep -v grep | awk '{print $1}')"
RETVAL=$?
if [ $RETVAL -eq 0 ]; then
echo_success
else
echo_failure
fi
dostatus
echo
}

restart () {
stop
start
}

# See how we were called.
case "$1" in
start)
start
;;
stop)
stop
;;
status)
dostatus 
;; 
restart)
restart
;;
*)
echo "Usage: unity_cache_server {start|stop|status|restart}"
exit 1
esac

exit $RETVAL
