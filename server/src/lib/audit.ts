import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type AuditAction =
  | "user.block"
  | "user.unblock"
  | "user.delete"
  | "user.block_domain"
  | "user.impersonate"
  | "project.delete"
  | "domain.unblock"
  | "cleanup.run";

export const AUDIT_ACTIONS: AuditAction[] = [
  "user.block",
  "user.unblock",
  "user.delete",
  "user.block_domain",
  "user.impersonate",
  "project.delete",
  "domain.unblock",
  "cleanup.run",
];

type Admin = { id: string; email: string };

type Target = { type: "user" | "project" | "domain" | "system"; id?: string; label?: string };

export const audit = async (admin: Admin, action: AuditAction, target: Target, meta: Prisma.InputJsonObject = {}) => {
  console.log(`[audit] ${admin.email} ${action} ${target.type} ${target.label ?? target.id ?? ""}`);
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action,
        targetType: target.type,
        targetId: target.id ?? null,
        targetLabel: target.label ?? null,
        meta,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
};
