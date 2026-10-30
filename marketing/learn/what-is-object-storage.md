# What is object storage?

Object storage keeps files as objects in a flat bucket, each addressed by a key rather than a folder path.

## The short version

Object storage keeps files as objects in a flat bucket, each addressed by a key rather than a folder path. It scales well and is reached over HTTP, which suits images, uploads and backups. Most services copy the Amazon S3 API, so one client library works with many providers. Objects are replaced whole, so it is not a substitute for a database.

## On EasyHost

Each EasyHost project can have one S3 compatible bucket. [Learn more](/products/storage).
