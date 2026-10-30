# S3 storage

One S3 compatible bucket per project. Use any S3 client, with files public by URL.

## What you get

- Endpoint `https://storage.easyhost.fun`, region `us-east-1`, path-style URLs
- Credentials scoped to your bucket, which you can rotate
- Upload, list, download and delete through the CLI
- Works with the AWS SDK, the MinIO client and rclone

## Try it

```
ezhst storage create files
ezhst storage info --json
ezhst storage upload logo.png --prefix images/
```

## Limits

One bucket per project. Every file is public by URL, so do not store private data here. See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](/docs#storage), or browse [guides by framework](/frameworks).
