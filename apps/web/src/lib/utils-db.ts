/**
 * Generate a nanoid-style unique ID
 */
export function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 21; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Get current timestamp as Unix epoch seconds
 */
export function now(): Date {
  return new Date();
}
