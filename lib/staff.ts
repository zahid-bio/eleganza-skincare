import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

const roles = ["owner", "catalog", "operations", "support", "analyst"] as const;
export type Role = (typeof roles)[number];
export type Permission =
  | "catalog"
  | "orders"
  | "support"
  | "report"
  | "customers"
  | "marketing"
  | "settings"
  | "audit";
const access: Record<Role, readonly Permission[]> = {
  owner: [
    "catalog",
    "orders",
    "support",
    "report",
    "customers",
    "marketing",
    "settings",
    "audit",
  ],
  catalog: ["catalog"],
  operations: ["orders"],
  support: ["support"],
  analyst: ["report"],
};
export const can = (role: Role, permission: Permission) =>
  access[role].includes(permission);
export const staffCookie = "eleganza_preview_staff";
const keys = createRemoteJWKSet(
  new URL("https://www.gstatic.com/iap/verify/public_key-jwk"),
);
const digest = (value: string) => createHash("sha256").update(value).digest();
const keyForRole = (role: Role) =>
  process.env["PREVIEW_" + role.toUpperCase() + "_KEY"];
const sessionKey = (role: Role) => {
  const secret = process.env.PREVIEW_SESSION_SECRET;
  const key = keyForRole(role);
  return secret && secret.length >= 32 && key && key.length >= 16
    ? digest(secret + ":" + key)
    : null;
};

export function localAdminEnabled() {
  return (
    !process.env.IAP_AUDIENCE && roles.some((role) => Boolean(sessionKey(role)))
  );
}

export async function previewSignIn(key: string) {
  if (!localAdminEnabled() || key.length < 16 || key.length > 500) return false;
  const role = roles.find((candidate) => {
    const expected = keyForRole(candidate);
    return expected && timingSafeEqual(digest(key), digest(expected));
  });
  if (!role) return false;
  const secret = sessionKey(role);
  if (!secret) return false;
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("eleganza-preview")
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(secret);
  (await cookies()).set(staffCookie, role + "." + token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false,
    path: "/admin",
    maxAge: 14400,
  });
  return true;
}

export async function staff(): Promise<{ role: Role; actor: string } | null> {
  if (process.env.IAP_AUDIENCE) {
    const token = (await headers()).get("x-goog-iap-jwt-assertion");
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: "https://cloud.google.com/iap",
        audience: process.env.IAP_AUDIENCE,
        algorithms: ["ES256"],
      });
      const directory = JSON.parse(
        process.env.IAP_STAFF_JSON || "{}",
      ) as Record<string, unknown>;
      const actor = payload.sub;
      const role =
        actor && Object.hasOwn(directory, actor) ? directory[actor] : undefined;
      return actor && roles.includes(role as Role)
        ? { role: role as Role, actor }
        : null;
    } catch {
      return null;
    }
  }
  const value = (await cookies()).get(staffCookie)?.value;
  if (!value) return null;
  const split = value.indexOf(".");
  const role = value.slice(0, split) as Role;
  if (!roles.includes(role)) return null;
  const secret = sessionKey(role);
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(value.slice(split + 1), secret, {
      issuer: "eleganza-preview",
      algorithms: ["HS256"],
    });
    return payload.role === role ? { role, actor: "preview:" + role } : null;
  } catch {
    return null;
  }
}
