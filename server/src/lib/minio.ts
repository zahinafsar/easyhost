import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Client } from "minio";
import { env } from "./env.js";

const run = promisify(execFile);

const MINIO_USER = "easyhost";

const minioUrl = env.minio.url;
const useSSL = minioUrl.protocol === "https:";
let defaultPort = 80;
if (useSSL) {
  defaultPort = 443;
}

export const minio = new Client({
  endPoint: minioUrl.hostname,
  port: Number(minioUrl.port || defaultPort),
  useSSL,
  accessKey: MINIO_USER,
  secretKey: env.minio.password,
});

export const S3_REGION = "us-east-1";

export const s3Endpoint = () => env.minio.publicUrl;

const mcHost = () => {
  const url = new URL(minioUrl.origin);
  url.username = MINIO_USER;
  url.password = env.minio.password;
  return url.href.replace(/\/$/, "");
};

const mc = async (args: string[]) => {
  try {
    await run("mc", ["--quiet", ...args], { env: { ...process.env, MC_HOST_eh: mcHost() } });
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(`mc ${args.slice(0, 4).join(" ")} failed: ${stderr || (error as Error).message}`);
  }
};

const bucketAccessPolicy = (minioName: string) => {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:ListBucket", "s3:GetBucketLocation", "s3:ListBucketMultipartUploads"],
        Resource: [`arn:aws:s3:::${minioName}`],
      },
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
        Resource: [`arn:aws:s3:::${minioName}/*`],
      },
    ],
  });
};

export const createBucketCredentials = async (minioName: string) => {
  const accessKey = `EH${randomBytes(9).toString("hex").toUpperCase()}`;
  const secretKey = randomBytes(30).toString("base64url");
  const dir = await mkdtemp(join(tmpdir(), "eh-policy-"));
  const policyFile = join(dir, "policy.json");
  try {
    await writeFile(policyFile, bucketAccessPolicy(minioName));
    await mc([
      "admin", "user", "svcacct", "add", "eh", MINIO_USER,
      "--access-key", accessKey,
      "--secret-key", secretKey,
      "--policy", policyFile,
      "--name", minioName,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  return { accessKey, secretKey };
};

export const removeBucketCredentials = async (accessKey: string) => {
  await mc(["admin", "user", "svcacct", "rm", "eh", accessKey]);
};

export const DEPLOY_BUCKET = "easyhost-deploys";

export const minioBucketName = (bucketId: string) => `eh-${bucketId.toLowerCase()}`;

const publicReadPolicy = (minioName: string) => {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${minioName}/*`],
      },
    ],
  });
};

export const createPublicBucket = async (minioName: string) => {
  await minio.makeBucket(minioName);
  await minio.setBucketPolicy(minioName, publicReadPolicy(minioName));
};

export const publicBaseUrl = (minioName: string) => `${env.minio.publicUrl}/${minioName}`;

export const publicObjectUrl = (minioName: string, key: string) => `${publicBaseUrl(minioName)}/${encodeURI(key)}`;

type StorageObject = { key: string; size: number; lastModified: Date | null; isFolder: boolean; url: string | null };

export const listAllObjects = (minioName: string, prefix = "") => {
  return new Promise<StorageObject[]>((resolve, reject) => {
    const items: StorageObject[] = [];
    const stream = minio.listObjectsV2(minioName, prefix, false);
    stream.on("data", (item) => {
      if (item.prefix) {
        items.push({ key: item.prefix, size: 0, lastModified: null, isFolder: true, url: null });
        return;
      }
      if (item.name) {
        items.push({
          key: item.name,
          size: item.size,
          lastModified: item.lastModified ?? null,
          isFolder: false,
          url: publicObjectUrl(minioName, item.name),
        });
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
