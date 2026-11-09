import { Hono } from "hono";
import type { Context } from "hono";
import { prisma } from "../lib/prisma.js";
import { generateToken } from "../lib/auth.js";
import { inviteUrl, sendProjectInviteEmail } from "../lib/email.js";
import { LIMITS } from "../lib/limits.js";
import { validate } from "../lib/validator.js";
import { inviteMemberSchema } from "../lib/validations.js";
import { requireSession, requireUser } from "../middleware/require-user.js";
import { requireProject } from "../middleware/require-project.js";
import type { UserEnv } from "../lib/types.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const userSummary = { id: true, name: true, email: true } as const;

const isOwner = (c: Context<UserEnv>) => c.get("projectOwnerId") === c.get("user").id;

const findInvite = (token: string) => prisma.projectInvite.findUnique({
  where: { token },
  include: {
    project: { select: { id: true, name: true, slug: true, userId: true, deleting: true } },
    invitedBy: { select: { name: true } },
  },
});

export const memberRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/", async (c) => {
    const projectId = c.get("projectId");
    const [owner, members, invites] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: c.get("projectOwnerId") }, select: userSummary }),
      prisma.projectMember.findMany({
        where: { projectId },
        select: { createdAt: true, user: { select: userSummary } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.projectInvite.findMany({
        where: { projectId },
        select: { id: true, email: true, expiresAt: true, createdAt: true, invitedBy: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    let role: "owner" | "member" = "member";
    if (isOwner(c)) {
      role = "owner";
    }
    return c.json({
      role,
      owner,
      members: members.map((member) => ({ ...member.user, joinedAt: member.createdAt })),
      invites: invites.map((invite) => ({ ...invite, invitedBy: invite.invitedBy.name, expired: invite.expiresAt < new Date() })),
      limit: LIMITS.projectMembers,
    });
  })
  .post("/invites", validate("json", inviteMemberSchema), async (c) => {
    if (!isOwner(c)) {
      return c.json({ error: "Only the project owner can invite members" }, 403);
    }
    const projectId = c.get("projectId");
    const { email } = c.req.valid("json");

    const existing = await prisma.user.findFirst({
      where: { email, OR: [{ apps: { some: { id: projectId } } }, { projectMembers: { some: { projectId } } }] },
      select: { id: true },
    });
    if (existing) {
      return c.json({ error: `${email} is already in this project` }, 400);
    }

    const [memberCount, inviteCount, pending] = await Promise.all([
      prisma.projectMember.count({ where: { projectId } }),
      prisma.projectInvite.count({ where: { projectId } }),
      prisma.projectInvite.findUnique({ where: { projectId_email: { projectId, email } }, select: { id: true } }),
    ]);
    if (!pending && memberCount + inviteCount >= LIMITS.projectMembers) {
      return c.json({ error: `Each project can have at most ${LIMITS.projectMembers} members and pending invites.` }, 400);
    }

    const token = generateToken();
    const invite = await prisma.projectInvite.upsert({
      where: { projectId_email: { projectId, email } },
      create: { projectId, email, token, invitedById: c.get("user").id, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      update: { token, invitedById: c.get("user").id, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      select: { id: true, email: true, expiresAt: true, createdAt: true, project: { select: { name: true } } },
    });

    try {
      await sendProjectInviteEmail(email, c.get("user").name, invite.project.name, token);
    } catch (error) {
      console.error("Failed to send project invite email", error);
      return c.json({ error: `Invite created, but the email could not be sent. Share this link instead: ${inviteUrl(token)}` }, 502);
    }

    return c.json({
      invite: { id: invite.id, email: invite.email, expiresAt: invite.expiresAt, createdAt: invite.createdAt },
      url: inviteUrl(token),
      message: `Invite sent to ${email}`,
    }, 201);
  })
  .delete("/invites/:id", async (c) => {
    if (!isOwner(c)) {
      return c.json({ error: "Only the project owner can revoke invites" }, 403);
    }
    const { count } = await prisma.projectInvite.deleteMany({ where: { id: c.req.param("id"), projectId: c.get("projectId") } });
    if (!count) {
      return c.json({ error: "Invite not found" }, 404);
    }
    return c.json({ message: "Invite revoked" });
  })
  .delete("/:userId", async (c) => {
    const userId = c.req.param("userId");
    const leaving = userId === c.get("user").id;
    if (!leaving && !isOwner(c)) {
      return c.json({ error: "Only the project owner can remove members" }, 403);
    }
    if (userId === c.get("projectOwnerId")) {
      return c.json({ error: "The project owner can't be removed" }, 400);
    }
    const { count } = await prisma.projectMember.deleteMany({ where: { projectId: c.get("projectId"), userId } });
    if (!count) {
      return c.json({ error: "Member not found" }, 404);
    }
    if (leaving) {
      return c.json({ message: "You left the project" });
    }
    return c.json({ message: "Member removed" });
  });

export const inviteRoutes = new Hono<UserEnv>()
  .use(requireSession)
  .get("/:token", async (c) => {
    const invite = await findInvite(c.req.param("token"));
    if (!invite || invite.project.deleting) {
      return c.json({ error: "This invite is invalid or was revoked" }, 404);
    }
    return c.json({
      invite: {
        email: invite.email,
        projectName: invite.project.name,
        invitedBy: invite.invitedBy.name,
        expired: invite.expiresAt < new Date(),
      },
    });
  })
  .post("/:token/accept", async (c) => {
    const user = c.get("user");
    const invite = await findInvite(c.req.param("token"));
    if (!invite || invite.project.deleting) {
      return c.json({ error: "This invite is invalid or was revoked" }, 404);
    }
    if (invite.expiresAt < new Date()) {
      return c.json({ error: "This invite has expired. Ask the project owner to send a new one." }, 410);
    }
    if (invite.email !== user.email.toLowerCase()) {
      return c.json({ error: `This invite was sent to ${invite.email}. Log in with that email to accept it.` }, 403);
    }

    const project = { id: invite.project.id, name: invite.project.name, slug: invite.project.slug };
    await prisma.$transaction(async (tx) => {
      if (invite.project.userId !== user.id) {
        await tx.projectMember.upsert({
          where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
          create: { projectId: invite.projectId, userId: user.id },
          update: {},
        });
      }
      await tx.projectInvite.delete({ where: { id: invite.id } });
      await tx.user.update({ where: { id: user.id }, data: { verified: true, verifyCodeHash: null, verifyCodeExpires: null, verifyCodeSentAt: null, verifyAttempts: 0 } });
    });
    return c.json({ project, message: `You joined ${project.name}` });
  });
