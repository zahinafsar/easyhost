import { lookup } from "node:dns/promises";
import type { AppDomain } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { createNpmCertificate, createNpmProxyHost, deleteNpmCertificate, deleteNpmProxyHost } from "./npm.js";

export const resolvesToServer = async (hostname: string) => {
  try {
    const addresses = await lookup(hostname, { all: true });
    const ips = addresses.map((address) => address.address);
    return { ok: ips.includes(env.publicIp), ips };
  } catch {
    return { ok: false, ips: [] as string[] };
  }
};

export const provisionDomain = async (domain: AppDomain) => {
  if (!env.npm) {
    return { npmCertificateId: null, npmProxyHostId: null };
  }
  const npmCertificateId = await createNpmCertificate(env.npm, domain.hostname);
  try {
    const npmProxyHostId = await createNpmProxyHost(env.npm, domain.hostname, npmCertificateId);
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

export const isPlatformHostname = (hostname: string) => {
  return hostname === env.appsDomain || hostname.endsWith(`.${env.appsDomain}`);
};

export const markDomainFailed = (id: string, error: string) => {
  return prisma.appDomain.update({ where: { id }, data: { status: "FAILED", error } });
};
