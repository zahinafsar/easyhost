import type { Schedule } from "@prisma/client";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { prisma } from "./prisma.js";

const privateAddresses = new BlockList();
for (const [address, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) {
  privateAddresses.addSubnet(address, prefix, "ipv4");
}
const publicV6 = new BlockList();
publicV6.addSubnet("2000::", 3, "ipv6");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16]] as const) {
  privateAddresses.addSubnet(address, prefix, "ipv6");
}

const isPublicAddress = (address: string) => {
  const family = isIP(address);
  if (family === 4) {
    return !privateAddresses.check(address, "ipv4");
  }
  return family === 6 && publicV6.check(address, "ipv6") && !privateAddresses.check(address, "ipv6");
};

const callSchedule = async (schedule: Schedule) => {
  const url = new URL(schedule.url);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Schedule URL must use HTTP or HTTPS without embedded credentials");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Request timed out after 30 seconds")), 30_000);
  try {
    const aborted = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
    });
    const addresses = await Promise.race([lookup(hostname, { all: true, verbatim: true }), aborted]);
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new Error("Schedule URL must resolve only to public IP addresses");
    }
    controller.signal.throwIfAborted();
    const address = addresses.find((entry) => entry.family === 4) ?? addresses[0];
    return await new Promise<number>((resolve, reject) => {
      const request = url.protocol === "https:" ? httpsRequest : httpRequest;
      const req = request(url, {
        hostname: address.address,
        family: address.family,
        servername: hostname,
        method: schedule.method,
        headers: { ...(schedule.headers as Record<string, string>), host: url.host },
        agent: false,
        signal: controller.signal,
      }, (res) => {
        const statusCode = res.statusCode;
        res.destroy();
        if (statusCode === undefined) {
          reject(new Error("API returned no HTTP status"));
        } else {
          resolve(statusCode);
        }
      });
      req.on("error", (error) => reject(controller.signal.aborted ? controller.signal.reason : error));
      req.end(schedule.body ?? undefined);
    });
  } finally {
    clearTimeout(timer);
  }
};

const claimSchedule = async () => {
  const lockToken = crypto.randomUUID();
  const rows = await prisma.$queryRaw<Schedule[]>`
    UPDATE schedules SET
      "lockedUntil" = NOW() + interval '60 seconds',
      "lockToken" = ${lockToken},
      "nextRunAt" = NOW() + "intervalMinutes" * interval '1 minute'
    WHERE id = (
      SELECT s.id FROM schedules s
      JOIN apps p ON p.id = s."projectId"
      JOIN users u ON u.id = p."userId"
      WHERE s.enabled = true AND s."nextRunAt" <= NOW()
        AND (s."lockedUntil" IS NULL OR s."lockedUntil" <= NOW())
        AND p.deleting = false AND p."parentProjectId" IS NULL AND u.blocked = false
      ORDER BY s."nextRunAt"
      LIMIT 1 FOR UPDATE OF s SKIP LOCKED
    )
    RETURNING *
  `;
  return rows[0] ?? null;
};

const runSchedule = async (schedule: Schedule) => {
  const startedAt = new Date();
  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    statusCode = await callSchedule(schedule);
    if (statusCode < 200 || statusCode >= 300) {
      error = statusCode >= 300 && statusCode < 400 ? `HTTP ${statusCode}: redirects are not followed` : `HTTP ${statusCode}`;
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 1000) : "API request failed";
  }
  const finishedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const released = await tx.schedule.updateMany({
      where: { id: schedule.id, lockToken: schedule.lockToken },
      data: { lockedUntil: null, lockToken: null },
    });
    if (!released.count) {
      return;
    }
    await tx.scheduleRun.create({ data: { scheduleId: schedule.id, startedAt, finishedAt, statusCode, error, durationMs: finishedAt.getTime() - startedAt.getTime() } });
    const old = await tx.scheduleRun.findMany({ where: { scheduleId: schedule.id }, orderBy: [{ startedAt: "desc" }, { id: "desc" }], skip: 100, select: { id: true } });
    if (old.length) {
      await tx.scheduleRun.deleteMany({ where: { id: { in: old.map((run) => run.id) } } });
    }
  });
};

let active = 0;
let draining = false;
let started = false;

const processSchedules = async () => {
  if (draining) {
    return;
  }
  draining = true;
  try {
    while (active < 4) {
      const schedule = await claimSchedule();
      if (!schedule) {
        break;
      }
      active += 1;
      runSchedule(schedule)
        .catch((error) => console.error("Schedule execution failed", error))
        .finally(() => {
          active -= 1;
          processSchedules().catch((error) => console.error("Schedule worker failed", error));
        });
    }
  } finally {
    draining = false;
  }
};

export const startScheduleWorker = () => {
  if (started) {
    return;
  }
  started = true;
  processSchedules().catch((error) => console.error("Schedule worker failed", error));
  setInterval(() => processSchedules().catch((error) => console.error("Schedule worker failed", error)), 10_000);
};
