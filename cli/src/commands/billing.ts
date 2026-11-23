import pc from "picocolors";
import { request } from "../lib/api.js";
import { formatBytes, log, output } from "../lib/ui.js";

type Plan = { id: string; name: string; price: number; projects: number; apps: number; dbBytes: number; storageBytes: number; monthlyTokens: number };

type Overview = {
  plan: Plan;
  plans: { free: Plan; pro: Plan };
  subscription: { status: string; renewsAt: string | null; endsAt: string | null } | null;
  tokenBalance: number;
  projects: { id: string; name: string; slug: string; allowed: boolean; usage: { apps: number; dbBytes: number; storageBytes: number } }[];
};

export const showBilling = async () => {
  const overview = await request<Overview>("/billing");
  output(overview, () => {
    const { plan } = overview;
    log.info(`${pc.bold("Plan")}     ${plan.name} ($${plan.price}/mo)`);
    if (overview.subscription) {
      log.info(`${pc.bold("Status")}   ${overview.subscription.status.toLowerCase().replace("_", " ")}`);
    }
    if (overview.subscription?.renewsAt) {
      log.info(`${pc.bold("Renews")}   ${new Date(overview.subscription.renewsAt).toLocaleDateString()}`);
    }
    log.info(`${pc.bold("Tokens")}   ${overview.tokenBalance}`);
    log.info(`${pc.bold("Projects")} ${overview.projects.length} / ${plan.projects}`);
    for (const project of overview.projects) {
      let paused = "";
      if (!project.allowed) {
        paused = pc.red(" paused");
      }
      log.info(
        `  ${project.slug.padEnd(40)} apps ${project.usage.apps}/${plan.apps}  db ${formatBytes(project.usage.dbBytes)}/${formatBytes(plan.dbBytes)}  storage ${formatBytes(project.usage.storageBytes)}/${formatBytes(plan.storageBytes)}${paused}`,
      );
    }
    if (plan.id === "FREE") {
      const pro = overview.plans.pro;
      log.info(`Upgrade to Pro ($${pro.price}/mo, ${pro.projects} projects, ${pro.monthlyTokens} AI tokens a month) with \`ezhst billing upgrade\`.`);
    }
  });
};

export const upgradeBilling = async () => {
  const { url } = await request<{ url: string }>("/billing/checkout", { method: "POST" });
  output({ url }, () => log.info(`Finish checkout in your browser: ${url}`));
};

export const billingPortal = async () => {
  const { url } = await request<{ url: string }>("/billing/portal");
  output({ url }, () => log.info(`Manage billing: ${url}`));
};
