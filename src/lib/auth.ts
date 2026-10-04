import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { IUser } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_sharewatching_2026_default";
const TOKEN_EXPIRY = "7d";
export const AUTH_COOKIE_NAME = "sw_auth_token";

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<IUser | null> {
  // Check cookie first
  let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Fallback to Bearer token in Authorization header
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  let user = await db.findUserById(payload.userId);
  if (!user && payload.userId && payload.name && payload.email) {
    user = {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(payload.name)}`,
      createdAt: new Date().toISOString(),
    };
  }
  return user;
}

export function setAuthCookie(res: NextResponse, token: string): void {
  // Allow cookies on localhost during development and production (npm start)
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
