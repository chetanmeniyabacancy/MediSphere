import { createHmac, timingSafeEqual } from "node:crypto";

export const PATIENT_SESSION_COOKIE = "medflow_patient_session";
export const PATIENT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  email: string;
  exp: number;
};

function getSessionSecret(): string {
  const configured = process.env.MANUAL_AUTH_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return "medflow-dev-session-secret-change-me";
  }

  return "";
}

function sign(input: string): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("Missing MANUAL_AUTH_SECRET for manual patient session signing.");
  }

  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function createPatientSessionToken(input: { sub: string; email: string }): string {
  const payload: SessionPayload = {
    sub: input.sub,
    email: input.email,
    exp: Date.now() + PATIENT_SESSION_TTL_SECONDS * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyPatientSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  let expectedSignature: string;
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.sub || !payload.email || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
