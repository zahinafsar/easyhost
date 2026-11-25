const MB = 1024 * 1024;

export type PlanId = "FREE" | "PRO";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  projects: number;
  apps: number;
  dbBytes: number;
  storageBytes: number;
  monthlyTokens: number;
  buildsPerDay: number;
};

export const FREE: Plan = {
  id: "FREE",
  name: "Free",
  price: 0,
  projects: 3,
  apps: 2,
  dbBytes: 128 * MB,
  storageBytes: 256 * MB,
  monthlyTokens: 0,
  buildsPerDay: 10,
};

export const PRO: Plan = {
  id: "PRO",
  name: "Pro",
  price: 10,
  projects: 10,
  apps: 2,
  dbBytes: 128 * MB,
  storageBytes: 256 * MB,
  monthlyTokens: 500,
  buildsPerDay: 50,
};

export const PLANS = [FREE, PRO];
