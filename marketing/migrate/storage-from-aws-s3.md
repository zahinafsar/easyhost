# Move files from Amazon S3 to EasyHost

Use rclone to copy a bucket from Amazon S3 into EasyHost storage.

## Configure rclone

```rclone.conf
[source]
type = s3
provider = AWS
access_key_id = <key>
secret_access_key = <secret>

[easyhost]
type = s3
provider = Minio
endpoint = https://storage.easyhost.fun
region = us-east-1
force_path_style = true
access_key_id = <key>
secret_access_key = <secret>
```

Pick the source region in the remote settings. Egress charges may apply on the AWS side.

> Every file on EasyHost is public by URL. Do not copy private files.

## Copy

```
npx ezhst storage create files
npx ezhst storage info --json
rclone copy source:my-bucket easyhost:<bucket> --progress
```

## Update your app

```
npx ezhst env set S3_ENDPOINT=https://storage.easyhost.fun S3_BUCKET=<bucket>
npx ezhst redeploy
```

Use path-style URLs in your client. See the [storage product page](/products/storage).
