# What is a reverse proxy?

A reverse proxy sits in front of your app and forwards requests to it.

## The short version

A reverse proxy sits in front of your app and forwards requests to it. It commonly terminates HTTPS, routes hostnames to the right service and can add caching. Your app then speaks plain HTTP on an internal port, which is why apps behind a proxy must listen on `0.0.0.0` rather than localhost.

## On EasyHost

On EasyHost, this routing is handled for you. Your app just listens on `PORT`. [Learn more](/products/app-hosting).
