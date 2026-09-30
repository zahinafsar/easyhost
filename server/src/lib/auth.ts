import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);
const AUTH_COOKIE = "auth-token";

export interface JWTPayload extends JoseJWTPayload {
  userId: string;
  email: string;
  impersonatorId?: string;
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export const verifyPassword = (password: string, hashedPassword: string) => bcrypt.compare(password, hashedPassword);

export const createToken = (payload: JWTPayload, expiresIn = "30d") => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
};

export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
};

export const setAuthCookie = (c: Context, token: string) => {
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
};

export const removeAuthCookie = (c: Context) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
};

const getAuthToken = (c: Context) => {
  const cookieToken = getCookie(c, AUTH_COOKIE);
  if (cookieToken) {
    return cookieToken;
  }
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || undefined;
  }
  return undefined;
};

export const getCurrentUser = async (c: Context) => {
  const token = getAuthToken(c);
  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      verified: true,
      blocked: true,
      createdAt: true,
    },
  });

  if (!user || user.blocked) {
    return null;
  }

  const { blocked, ...currentUser } = user;
  return { ...currentUser, impersonatorId: payload.impersonatorId ?? null };
};

export const generateToken = () => crypto.randomUUID().replace(/-/g, "");
