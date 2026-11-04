import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { query } from "./db.js";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30;
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const startSession = async (c, userId) => {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: MAX_AGE });
};

export const endSession = (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
};

export const currentUser = async (c) => {
  const token = getCookie(c, COOKIE);
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, secret);
    const rows = await query("SELECT id, name, email, created_at FROM users WHERE id = $1", [Number(payload.sub)]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
};

export const requireUser = createMiddleware(async (c, next) => {
  const user = await currentUser(c);
  if (!user) {
    return c.json({ error: "Please sign in" }, 401);
  }
  c.set("user", user);
  await next();
});
