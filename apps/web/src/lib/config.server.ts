/**
 * Server-side configuration helpers
 */

/**
 * Check if email verification is required
 * @returns true if EMAIL_VERIFICATION env var is set to "true"
 */
export function isEmailVerificationRequired(): boolean {
  return process.env.EMAIL_VERIFICATION === "true";
}
