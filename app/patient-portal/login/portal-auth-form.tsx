"use client";

import { useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

type AuthMode = "sign_in" | "set_password";

type ApiResult = {
  error?: string;
  data?: {
    email?: string;
    name?: string;
    password_set?: boolean;
  };
};

export function PortalAuthForm() {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setStatus("Email format is invalid. Use a full address like patient@example.com.");
      return;
    }

    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setStatus("");

    const endpoint =
      mode === "sign_in" ? "/api/patient-auth/login" : "/api/patient-auth/set-password";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const json = (await response.json()) as ApiResult;

      if (!response.ok || json.error) {
        setStatus(json.error ?? "Request failed.");
        setLoading(false);
        return;
      }

      if (mode === "set_password") {
        setStatus("Password saved. Switch to Sign In and login.");
        setLoading(false);
        return;
      }

      setStatus(`Login successful for ${json.data?.name ?? normalizedEmail}. Redirecting...`);
      window.location.href = "/patient-portal";
    } catch {
      setStatus("Network error while processing request.");
    }

    setLoading(false);
  }

  async function signOut() {
    setLoading(true);
    setStatus("");

    try {
      await fetch("/api/patient-auth/logout", {
        method: "POST",
      });
      setStatus("Signed out.");
    } catch {
      setStatus("Sign out failed.");
    }

    setLoading(false);
  }

  return (
    <div className="stack">
      <div className="inline-links">
        <button
          type="button"
          className={mode === "sign_in" ? "button" : "button button-secondary"}
          onClick={() => setMode("sign_in")}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === "set_password" ? "button" : "button button-secondary"}
          onClick={() => setMode("set_password")}
        >
          Set Password
        </button>
        <button type="button" className="button button-secondary" onClick={signOut}>
          Sign Out
        </button>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="portal_email">Email</label>
            <input
              id="portal_email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="portal_password">Password</label>
            <input
              id="portal_password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "sign_in"
                ? "Sign In"
                : "Save Password"}
          </button>
        </div>
      </form>

      {status ? <p className="notice">{status}</p> : null}
      <p className="small">
        Set Password works only on localhost and only for existing patient emails.
      </p>
    </div>
  );
}
