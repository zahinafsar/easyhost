# Move files from Cloudflare R2 to EasyHost

Use rclone to copy a bucket from Cloudflare R2 into EasyHost storage.

## Configure rclone

```rclone.conf
[source]
type = s3
provider = Cloudflare
access_key_id = <key>
secret_access_key = <secret>
endpoint = https://<account-id>.r2.cloudflarestorage.com

[easyhost]
type = s3
provider = Minio
endpoint = https://storage.easyhost.fun
region = us-east-1
force_path_style = true
access_key_id = <key>
secret_access_key = <secret>
```

Create an R2 API token with read access to the bucket.

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
