/**
 * API client for making requests to the API routes
 * These functions are used by components to interact with the backend
 */

export interface SmtpConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string;
}

/**
 * Fetch SMTP configuration
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const response = await fetch("/api/config/smtp", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Failed to fetch SMTP configuration");
  }

  return response.json();
}

/**
 * Update SMTP configuration
 */
export async function updateSmtpConfig(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name?: string;
}): Promise<SmtpConfig> {
  const response = await fetch("/api/config/smtp", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Failed to update SMTP configuration");
  }

  return response.json();
}

/**
 * Send a test email
 */
export async function sendTestEmail(email: string): Promise<{ message: string }> {
  const response = await fetch("/api/config/smtp/test", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Failed to send test email");
  }

  return response.json();
}
