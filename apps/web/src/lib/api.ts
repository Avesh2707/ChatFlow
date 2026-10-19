/**
 * Resolves the base URL for REST API calls.
 * - In production: defaults to relative "" (same-origin requests proxied through Next.js rewrites).
 * - In development: defaults to "http://localhost:5000" unless NEXT_PUBLIC_API_URL is explicitly provided.
 */
export const getApiUrl = (): string => {
  const customUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (customUrl !== undefined && customUrl !== "") {
    return customUrl.replace(/\/$/, "");
  }
  return process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";
};
