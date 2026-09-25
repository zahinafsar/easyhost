import { Client } from "minio";
import { env } from "./env.js";

export const minio = new Client({
  endPoint: env.minio.endpoint,
  port: env.minio.port,
  useSSL: env.minio.useSSL,
  accessKey: env.minio.accessKey,
  secretKey: env.minio.secretKey,
});

const publicUseSSL = env.minio.publicUseSSL;
const publicEndpoint = env.minio.publicEndpoint;
const publicPort = env.minio.publicPort;

const publicMinio = new Client({
  endPoint: publicEndpoint,
  port: publicPort,
  useSSL: publicUseSSL,
  accessKey: env.minio.accessKey,
  secretKey: env.minio.secretKey,
  region: "us-east-1",
});

export const presignedObjectUrl = (minioName: string, key: string, expirySeconds: number) => {
  return publicMinio.presignedGetObject(minioName, key, expirySeconds);
};

export const DEPLOY_BUCKET = env.minio.deployBucket;

export const minioBucketName = (bucketId: string) => `eh-${bucketId.toLowerCase()}`;

export const setBucketPublic = async (minioName: string, isPublic: boolean) => {
  if (!isPublic) {
    await minio.setBucketPolicy(minioName, "");
    return;
  }
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${minioName}/*`],
      },
    ],
  };
  await minio.setBucketPolicy(minioName, JSON.stringify(policy));
};

export const listAllObjects = (minioName: string, prefix = "") => {
  return new Promise<{ key: string; size: number; lastModified: Date | null; isFolder: boolean }[]>((resolve, reject) => {
    const items: { key: string; size: number; lastModified: Date | null; isFolder: boolean }[] = [];
    const stream = minio.listObjectsV2(minioName, prefix, false);
    stream.on("data", (item) => {
      if (item.prefix) {
        items.push({ key: item.prefix, size: 0, lastModified: null, isFolder: true });
        return;
      }
      if (item.name) {
        items.push({ key: item.name, size: item.size, lastModified: item.lastModified ?? null, isFolder: false });
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(items));
  });
};

export const emptyAndRemoveBucket = async (minioName: string) => {
  const keys: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = minio.listObjectsV2(minioName, "", true);
    stream.on("data", (item) => {
      if (item.name) {
        keys.push(item.name);
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  if (keys.length) {
    await minio.removeObjects(minioName, keys);
  }
  await minio.removeBucket(minioName);
};

export const publicObjectUrl = (minioName: string, key: string) => {
  let protocol = "http";
  let defaultPort = 80;
  if (publicUseSSL) {
    protocol = "https";
    defaultPort = 443;
  }
  let host = publicEndpoint;
  if (publicPort !== defaultPort) {
    host = `${publicEndpoint}:${publicPort}`;
  }
  return `${protocol}://${host}/${minioName}/${encodeURI(key)}`;
};
