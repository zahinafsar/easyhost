import { statfs } from "node:fs/promises";
import os from "node:os";
import { prisma } from "./prisma.js";
import { docker, containerName } from "./docker.js";
import { bucketSize } from "./minio.js";
import { userdbStats } from "./userdb.js";

const SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 5;

type ContainerStats = {
  memory_stats: { usage?: number };
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number; online_cpus?: number };
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number };
};

export const containerUsage = async (name: string) => {
  try {
    const stats = (await docker.getContainer(name).stats({ stream: false })) as ContainerStats;
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = (stats.cpu_stats.system_cpu_usage ?? 0) - (stats.precpu_stats.system_cpu_usage ?? 0);
    let cpuPercent = 0;
    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus ?? 1) * 100;
    }
    return { memoryBytes: stats.memory_stats.usage ?? 0, cpuPercent: Math.round(cpuPercent * 10) / 10 };
  } catch {
    return null;
  }
};

const mapLimited = async <T, R>(items: T[], run: (item: T) => Promise<R>) => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

type CpuTimes = { idle: number; total: number };

const cpuTimes = (): CpuTimes => {
  return os.cpus().reduce(
    (sum, cpu) => {
      const total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
      return { idle: sum.idle + cpu.times.idle, total: sum.total + total };
    },
    { idle: 0, total: 0 },
  );
};

let previousCpu: CpuTimes | null = null;

const hostCpuPercent = async () => {
  let start = previousCpu;
  if (!start) {
    start = cpuTimes();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const end = cpuTimes();
  previousCpu = end;
  const total = end.total - start.total;
  if (total <= 0) {
    return 0;
  }
  return Math.round((1 - (end.idle - start.idle) / total) * 1000) / 10;
};

const storageBytes = async () => {
  const buckets = await prisma.bucket.findMany({ select: { minioName: true } });
  const sizes = await mapLimited(buckets, (bucket) => bucketSize(bucket.minioName).catch(() => 0));
  return sizes.reduce((sum, size) => sum + size, 0);
};

const sample = async () => {
  const [cpuPercent, disk, info, apps, buildsQueued, buildsRunning, db, storage] = await Promise.all([
    hostCpuPercent(),
    statfs("/"),
    docker.info().catch(() => null),
    prisma.app.findMany({ where: { status: "RUNNING" }, select: { id: true, slug: true } }),
    prisma.deployment.count({ where: { status: "QUEUED" } }),
    prisma.deployment.count({ where: { status: "BUILDING" } }),
    userdbStats().catch(() => ({ bytes: 0 })),
    storageBytes().catch(() => 0),
  ]);

  const usage = await mapLimited(apps, (app) => containerUsage(containerName(app.slug)));
  const now = new Date();
  const appRows = apps.flatMap((app, index) => {
    const stat = usage[index];
    if (!stat) {
      return [];
    }
    return [{ appId: app.id, memoryBytes: BigInt(stat.memoryBytes), cpuPercent: stat.cpuPercent, createdAt: now }];
  });

  const memTotal = os.totalmem();
  const diskTotal = disk.blocks * disk.bsize;
  let containersRunning = 0;
  if (info) {
    containersRunning = info.ContainersRunning;
  }

  await prisma.$transaction([
    prisma.metricSample.create({
      data: {
        cpuPercent,
        load1: os.loadavg()[0],
        memUsed: BigInt(memTotal - os.freemem()),
        memTotal: BigInt(memTotal),
        diskUsed: BigInt(diskTotal - disk.bavail * disk.bsize),
        diskTotal: BigInt(diskTotal),
        containersRunning,
        appsRunning: apps.length,
        buildsQueued,
        buildsRunning,
        dbBytes: BigInt(db.bytes),
        storageBytes: BigInt(storage),
        createdAt: now,
      },
    }),
    prisma.appMetricSample.createMany({ data: appRows }),
  ]);

  const cutoff = new Date(Date.now() - RETENTION_MS);
  await prisma.metricSample.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await prisma.appMetricSample.deleteMany({ where: { createdAt: { lt: cutoff } } });
};

export const startMetricsWorker = () => {
  let running = false;
  const tick = () => {
    if (running) {
      return;
    }
    running = true;
    sample()
      .catch((error) => console.error("[metrics] sample failed", error))
      .finally(() => {
        running = false;
      });
  };
  tick();
  setInterval(tick, SAMPLE_INTERVAL_MS);
};
