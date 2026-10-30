# What does S3 compatible mean?

S3 compatible storage accepts the same API calls as Amazon S3, so existing SDKs and tools work after changing the endpoint and credentials.

## The short version

S3 compatible storage accepts the same API calls as Amazon S3, so existing SDKs and tools work after changing the endpoint and credentials. Compatibility can vary in details such as hostname style. Many providers use path-style URLs, where the bucket appears in the path, rather than virtual-hosted URLs, where it appears in the hostname.

## On EasyHost

EasyHost storage requires path-style URLs and uses region `us-east-1`. [Learn more](/products/storage).
