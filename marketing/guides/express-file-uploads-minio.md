# Express file uploads with the MinIO JavaScript client

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
npm i minio
```

```src/s3.ts
import { Client } from "minio";

export const s3 = new Client({
  endPoint: "storage.easyhost.fun",
  useSSL: true,
  region: "us-east-1",
  pathStyle: true,
  accessKey: process.env.S3_ACCESS_KEY_ID!,
  secretKey: process.env.S3_SECRET_ACCESS_KEY!,
});
```

Pass the hostname without `https://` as `endPoint`. The client uses path-style URLs when `pathStyle` is true.

## Create the upload route

```src/index.ts
import { s3 } from "./s3";
app.post("/api/uploads", async (req, res) => {
  const key = `uploads/${crypto.randomUUID()}`;
  const url = await s3.presignedPutObject(process.env.S3_BUCKET!, key, 300);
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
