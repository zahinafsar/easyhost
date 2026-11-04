import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

const env = process.env;

const createClient = () => {
  if (!env.S3_BUCKET) {
    return null;
  }
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
};

export const storage = createClient();

const ensureStorage = () => {
  if (!storage) {
    throw new Error("Storage is not configured");
  }
  return storage;
};

export const publicUrl = (key) => `${env.S3_PUBLIC_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;

export const uploadFile = async (key, body, contentType) => {
  await ensureStorage().send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return publicUrl(key);
};

export const listFiles = async (prefix) => {
  const result = await ensureStorage().send(new ListObjectsV2Command({ Bucket: env.S3_BUCKET, Prefix: prefix }));
  return (result.Contents ?? []).map((item) => ({
    key: item.Key,
    name: item.Key.slice(prefix.length),
    size: item.Size,
    updatedAt: item.LastModified,
    url: publicUrl(item.Key),
  }));
};

export const deleteFile = async (key) => {
  await ensureStorage().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
};
