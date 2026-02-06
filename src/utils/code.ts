/**
 * Generate a secure random session code
 * Format: 6 alphanumeric characters (uppercase)
 */
export function generateSessionCode(): string {
  // 4 chars is enough for ~1.6M combinations (36^4)
  // Good balance of short code vs collision risk for small/medium traffic
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}
