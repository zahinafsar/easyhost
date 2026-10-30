# What is Alpine Linux and musl?

Alpine is a very small Linux distribution, popular for container images.

## The short version

Alpine is a very small Linux distribution, popular for container images. It uses the musl C library rather than glibc, so native Node.js modules need binaries built for musl. Well-maintained packages ship these, but older ones can fail to install or load. That is the usual cause of native module errors on Alpine.

## On EasyHost

EasyHost builds on `node:<version>-alpine`. [Learn more](/errors/sharp-musl).
