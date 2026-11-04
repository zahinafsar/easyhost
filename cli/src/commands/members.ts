import pc from "picocolors";
import { json, request } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { confirmed, fail, log, output } from "../lib/ui.js";

type Person = { id: string; name: string; email: string };
type Invite = { id: string; email: string; expiresAt: string; invitedBy: string; expired: boolean };
type MembersResponse = {
  role: "owner" | "member";
  owner: Person;
  members: (Person & { joinedAt: string })[];
  invites: Invite[];
  limit: number;
};

const fetchMembers = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  const data = await request<MembersResponse>("/members", {}, project.id);
  return { project, data };
};

const inviteToken = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1);
};

export const listMembers = async (options: ProjectOption) => {
  const { data } = await fetchMembers(options);
  output(data, () => {
    log.info(`${pc.bold(data.owner.name.padEnd(24))} ${data.owner.email.padEnd(32)} ${pc.dim("owner")}`);
    for (const member of data.members) {
      log.info(`${pc.bold(member.name.padEnd(24))} ${member.email.padEnd(32)} ${pc.dim("member")}`);
    }
    for (const invite of data.invites) {
      let status = `invited, expires ${invite.expiresAt}`;
      if (invite.expired) {
        status = "invite expired";
      }
      log.info(`${"".padEnd(24)} ${invite.email.padEnd(32)} ${pc.dim(status)}`);
    }
  });
};

export const inviteMember = async (email: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const result = await request<{ invite: { id: string; email: string; expiresAt: string }; url: string; message: string }>(
    "/members/invites",
    json("POST", { email }),
    project.id,
  );
  output(result, () => {
    log.success(result.message);
    log.info(`Invite link: ${result.url}`);
  });
};

export const revokeInvite = async (email: string, options: ProjectOption) => {
  const { project, data } = await fetchMembers(options);
  const invite = data.invites.find((item) => item.email === email.trim().toLowerCase());
  if (!invite) {
    return fail(`No pending invite for ${email}.`);
  }
  const result = await request<{ message: string }>(`/members/invites/${invite.id}`, { method: "DELETE" }, project.id);
  output(result, () => log.success(result.message));
};

export const removeMember = async (email: string, options: ProjectOption & { yes?: boolean }) => {
  const { project, data } = await fetchMembers(options);
  const member = data.members.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
  if (!member) {
    return fail(`${email} is not a member of this project.`);
  }
  confirmed(options.yes, `Removing ${member.email} takes away their access to ${project.name}.`);
  const result = await request<{ message: string }>(`/members/${member.id}`, { method: "DELETE" }, project.id);
  output(result, () => log.success(result.message));
};

export const leaveProject = async (options: ProjectOption & { yes?: boolean }) => {
  const project = await resolveProject(options);
  const { user } = await request<{ user: { id: string } }>("/auth/me");
  confirmed(options.yes, `Leaving ${project.name} removes your access until the owner invites you again.`);
  const result = await request<{ message: string }>(`/members/${user.id}`, { method: "DELETE" }, project.id);
  output(result, () => log.success(result.message));
};

export const acceptInvite = async (tokenOrUrl: string) => {
  const token = inviteToken(tokenOrUrl);
  const result = await request<{ project: { id: string; name: string; slug: string }; message: string }>(
    `/invites/${token}/accept`,
    { method: "POST" },
  );
  output(result, () => {
    log.success(result.message);
    log.info(`Use it with \`--project ${result.project.slug}\` or \`ezhst link --project ${result.project.slug}\`.`);
  });
};
