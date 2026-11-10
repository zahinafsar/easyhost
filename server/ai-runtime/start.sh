#!/bin/sh
cd /srv/app
if [ -f package.json ] && grep -q '"dependencies"' package.json; then
  npm install --no-audit --no-fund --prefer-offline --loglevel=error
fi
exec node /srv/easyhost-proxy.mjs
