import pc from "picocolors";
import { json, request } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { fail, log, output } from "../lib/ui.js";

type Sender = { id: string; username: string; address: string; createdAt: string };

type EmailLog = { id: string; from: string; to: string[]; subject: string; status: string; error: string | null; createdAt: string };

type EmailOverview = {
  logs: EmailLog[];
  total: number;
  page: number;
  limit: number;
  sentToday: number;
  dailyLimit: number;
  senders: Sender[];
  domain: string;
};

const overview = async (options: ProjectOption, page = "1") => {
  const project = await resolveProject(options);
  const query = new URLSearchParams({ page });
  const data = await request<EmailOverview>(`/emails?${query}`, {}, project.id);
  return { project, data };
};

export const emailInfo = async (options: ProjectOption) => {
  const { data } = await overview(options);
  output({ senders: data.senders, sentToday: data.sentToday, dailyLimit: data.dailyLimit }, () => {
    const sender = data.senders[0];
    if (sender) {
      log.info(`Sender: ${pc.bold(sender.address)}`);
    } else {
      log.info(`No sender yet. Create one with \`ezhst email sender create <username>\` (<username>@${data.domain}).`);
    }
    log.info(`Sent in the last 24h: ${data.sentToday}/${data.dailyLimit}`);
  });
};

export const createSender = async (username: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { senders } = await request<{ senders: Sender[] }>("/emails/senders", json("POST", { username }), project.id);
  output({ senders }, () => log.success(`Sender ${senders[0]?.address} created`));
};

export const deleteSender = async (options: ProjectOption) => {
  const { project, data } = await overview(options);
  const sender = data.senders[0];
  if (!sender) {
    return fail("This project has no sender address.");
  }
  await request(`/emails/senders/${sender.id}`, { method: "DELETE" }, project.id);
  output({ deleted: sender.address }, () => log.success(`Deleted ${sender.address}`));
};

export const sendEmail = async (
  options: ProjectOption & { from?: string; to?: string[]; subject?: string; text?: string; html?: string },
) => {
  const project = await resolveProject(options);
  const { from, subject } = options;
  if (!from) {
    return fail("Missing --from.");
  }
  if (!subject) {
    return fail("Missing --subject.");
  }
  if (!options.to?.length) {
    return fail("Missing --to.");
  }
  if (!options.text && !options.html) {
    return fail("Pass --text or --html.");
  }
  let to: string | string[] = options.to;
  if (options.to.length === 1) {
    to = options.to[0];
  }
  const result = await request<{ id: string; from: string }>(
    "/emails/send",
    json("POST", { from, to, subject, text: options.text, html: options.html }),
    project.id,
  );
  output(result, () => log.success(`Sent from ${result.from}`));
};

export const emailLogs = async (options: ProjectOption & { page?: string }) => {
  const { data } = await overview(options, options.page);
  output({ logs: data.logs, total: data.total, page: data.page }, () => {
    if (!data.logs.length) {
      log.info("No emails sent yet.");
      return;
    }
    for (const entry of data.logs) {
      log.info(`${pc.dim(entry.createdAt)} ${entry.status.padEnd(7)} ${entry.from} to ${entry.to.join(", ")}: ${entry.subject}`);
      if (entry.error) {
        log.warn(`  ${entry.error}`);
      }
    }
    log.dim(`Page ${data.page}, ${data.total} emails total`);
  });
};
