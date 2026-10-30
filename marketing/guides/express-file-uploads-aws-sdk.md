# Express file uploads with the AWS SDK v3

Let the browser upload straight to a free S3 compatible bucket, using a short-lived URL from your Express server. Your 512 MB container never holds the file.

## Create the bucket

```
npx ezhst storage create files
npx ezhst storage info --json
npx ezhst env set S3_BUCKET=<bucket> S3_ACCESS_KEY_ID=<key> S3_SECRET_ACCESS_KEY=<secret>
```

> Every file in the bucket is public by URL. Do not use it for private documents.

## Create the client

```
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```src/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: "https://storage.easyhost.fun",
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
```

`forcePathStyle: true` is required. Without it the SDK puts the bucket in the hostname, and the request fails.

## Create the upload route

```src/index.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "./s3";
app.post("/api/uploads", async (req, res) => {
  const key = `uploads/${crypto.randomUUID()}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    { expiresIn: 300 },
  );
  res.json({ url, publicUrl: `https://storage.easyhost.fun/${process.env.S3_BUCKET}/${key}` });
});
```

Add your own authentication and file type checks here, because anyone who can reach this route can upload.

## Upload from the browser

```
const { url, publicUrl } = await fetch("/api/uploads", { method: "POST" }).then((res) => res.json());
await fetch(url, { method: "PUT", body: file });
```

## Deploy

```
npx ezhst redeploy
```

Local disk is lost on each deploy, which is why uploads belong in the bucket. See the [Express hub](/frameworks/express) for every Express guide, or [free Express hosting](/free-express-hosting) for what is included. See also the [storage product page](/products/storage).

## Frequently asked questions

### Does the bucket support private files?

No. Files are public by URL. Use long random keys only for low-risk content, and keep private data elsewhere.
