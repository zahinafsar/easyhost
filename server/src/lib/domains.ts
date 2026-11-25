import { lookup } from "node:dns/promises";
import type { AppDomain } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { APP_PORT, containerName } from "./docker.js";
import { createNpmCertificate, createNpmProxyHost, deleteNpmCertificate, deleteNpmProxyHost } from "./npm.js";

export const appHost = (slug: string) => `${slug}.${env.appsDomain}`;

export const appUrl = (slug: string) => `${env.appsProtocol}://${appHost(slug)}`;

export const resolvesToServer = async (hostname: string) => {
  try {
    const addresses = await lookup(hostname, { all: true });
    const ips = addresses.map((address) => address.address);
    return { ok: ips.includes(env.publicIp), ips };
  } catch {
    return { ok: false, ips: [] as string[] };
  }
};

export const provisionDomain = async (domain: AppDomain, slug: string) => {
  if (!env.npm) {
    return { npmCertificateId: null, npmProxyHostId: null };
  }
  const npmCertificateId = await createNpmCertificate(env.npm, domain.hostname);
  try {
    const npmProxyHostId = await createNpmProxyHost(env.npm, domain.hostname, npmCertificateId, {
      host: containerName(slug),
      port: APP_PORT,
    });
    return { npmCertificateId, npmProxyHostId };
  } catch (error) {
    await deleteNpmCertificate(env.npm, npmCertificateId).catch(() => undefined);
    throw error;
  }
};

export const releaseDomain = async (domain: AppDomain) => {
  if (!env.npm) {
    return;
  }
  if (domain.npmProxyHostId) {
    await deleteNpmProxyHost(env.npm, domain.npmProxyHostId);
  }
  if (domain.npmCertificateId) {
    await deleteNpmCertificate(env.npm, domain.npmCertificateId);
  }
};

const isUnder = (hostname: string, domain: string) => hostname === domain || hostname.endsWith(`.${domain}`);

export const isPlatformHostname = (hostname: string) => {
  return isUnder(hostname, env.appsDomain) || isUnder(hostname, env.platformDomain);
};

export const markDomainFailed = (id: string, error: string) => {
  return prisma.appDomain.update({ where: { id }, data: { status: "FAILED", error } });
};
