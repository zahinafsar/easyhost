import type { LanguageModelUsage } from "ai";
import { prisma } from "./prisma.js";

const GEMINI_USD_PER_MILLION = {
  input: 1.5,
  cachedInput: 0.15,
  output: 7.5,
} as const;

const MARKUP = 2;
const TOKEN_USD = 0.01;

export const MIN_TOKENS_TO_BUILD = 20;

export const TOKEN_PACKS = [
  { id: "starter", name: "Starter", tokens: 500, cents: 500 },
  { id: "builder", name: "Builder", tokens: 1100, cents: 1000 },
  { id: "pro", name: "Pro", tokens: 2400, cents: 2000 },
  { id: "scale", name: "Scale", tokens: 6500, cents: 5000 },
] as const;

export type UsageTotals = { input: number; cachedInput: number; output: number };

export const emptyUsage = (): UsageTotals => {
  return { input: 0, cachedInput: 0, output: 0 };
};

export const addUsage = (totals: UsageTotals, usage: LanguageModelUsage) => {
  const cached = usage.inputTokenDetails.cacheReadTokens ?? 0;
  const input = usage.inputTokenDetails.noCacheTokens ?? Math.max((usage.inputTokens ?? 0) - cached, 0);
  totals.input += input;
  totals.cachedInput += cached;
  totals.output += usage.outputTokens ?? 0;
  return totals;
};

export const tokensForUsage = (totals: UsageTotals) => {
  const usd =
    (totals.input * GEMINI_USD_PER_MILLION.input +
      totals.cachedInput * GEMINI_USD_PER_MILLION.cachedInput +
      totals.output * GEMINI_USD_PER_MILLION.output) /
    1_000_000;
  return Math.ceil((usd * MARKUP) / TOKEN_USD);
};

export const findPack = (id: string) => {
  return TOKEN_PACKS.find((pack) => pack.id === id) ?? null;
};

export type RunBilling = { userId: string; free: boolean; balance: number };

export const billingForRun = async (userId: string): Promise<RunBilling | null> => {
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { tokenBalance: true, freeAiBuildUsed: true },
  });
  if (!account.freeAiBuildUsed) {
    return { userId, free: true, balance: account.tokenBalance };
  }
  if (account.tokenBalance < MIN_TOKENS_TO_BUILD) {
    return null;
  }
  return { userId, free: false, balance: account.tokenBalance };
};

export const OUT_OF_TOKENS = "You are out of tokens. Buy tokens on the Tokens page to keep building with AI.";

export const markFreeBuildUsed = (userId: string) => {
  return prisma.user.updateMany({ where: { id: userId, freeAiBuildUsed: false }, data: { freeAiBuildUsed: true } });
};

export const recordUsage = async (
  billing: RunBilling,
  app: { id: string; name: string },
  usageId: string | null,
  totals: UsageTotals,
  tokens: number,
  charge: number,
) => {
  const data = {
    tokens,
    inputTokens: totals.input,
    cachedInputTokens: totals.cachedInput,
    outputTokens: totals.output,
  };
  let write = prisma.tokenUsage.create({
    data: { ...data, userId: billing.userId, appId: app.id, appName: app.name, free: billing.free },
  });
  if (usageId) {
    write = prisma.tokenUsage.update({ where: { id: usageId }, data });
  }
  const [usage] = await prisma.$transaction([
    write,
    prisma.user.update({ where: { id: billing.userId }, data: { tokenBalance: { decrement: charge } } }),
  ]);
  return usage.id;
};
