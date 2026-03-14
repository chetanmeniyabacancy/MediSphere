import { NextResponse } from "next/server";

export type AppRole = "admin" | "provider" | "billing" | "staff" | "patient";

const validRoles: AppRole[] = ["admin", "provider", "billing", "staff", "patient"];

export function resolveRequestRole(request: Request): AppRole {
  const headerRole = request.headers.get("x-medflow-role")?.trim().toLowerCase();
  if (headerRole && validRoles.includes(headerRole as AppRole)) {
    return headerRole as AppRole;
  }

  const defaultRole = process.env.DEFAULT_APP_ROLE?.trim().toLowerCase();
  if (defaultRole && validRoles.includes(defaultRole as AppRole)) {
    return defaultRole as AppRole;
  }

  return process.env.NODE_ENV === "production" ? "staff" : "admin";
}

export function requireRole(
  request: Request,
  allowedRoles: AppRole[],
): { role: AppRole; denial: NextResponse | null } {
  const role = resolveRequestRole(request);

  if (!allowedRoles.includes(role)) {
    return {
      role,
      denial: NextResponse.json(
        {
          error: `RBAC denied. Required role: ${allowedRoles.join(", ")}. Current role: ${role}.`,
        },
        { status: 403 },
      ),
    };
  }

  return { role, denial: null };
}
