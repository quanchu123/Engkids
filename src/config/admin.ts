/**
 * Admin Configuration
 * Centralized admin settings
 */

const DEFAULT_ADMIN_EMAILS = [
  'admin1@engkids.local',
  'admin2@engkids.local',
  'admin3@engkids.local',
];

// Admin emails read from environment variable (comma-separated).
// The default list keeps the production droplet usable even when the server env
// was not updated after creating the shared Engkids admin accounts.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS.join(','))
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if an email is an admin
 * Returns true ONLY if email is in ADMIN_EMAILS environment variable
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.length === 0) {
    console.error('[ADMIN] WARNING: No admin emails configured. Set ADMIN_EMAILS env var.');
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
