/**
 * Subdomain and Multi-Tenant Workspace Resolution Utility
 * Supports:
 * - Production: `<slug>.stanforteedge.com` -> returns `<slug>`
 * - Local Dev: `<slug>.localhost:5173` or `<slug>.lvh.me:5173` -> returns `<slug>`
 * - Query param override for testing: `?org=<slug>` or `?slug=<slug>`
 * - Disregards reserved subdomains (www, app, api, admin, portal, staging)
 */

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "portal",
  "staging",
  "dev",
  "mail",
  "auth",
  "assets",
  "cdn",
]);

export function getProjectBaseDomain(): string {
  if (typeof window === "undefined") {
    return "stanforteedge.com";
  }

  const host = window.location.host; // e.g. "acme.stanforteedge.com" or "localhost:5173"
  const hostname = window.location.hostname; // e.g. "acme.stanforteedge.com" or "localhost"

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return host; // e.g. "localhost:5173"
  }

  // If on a domain with at least 3 parts (e.g. acme.stanforteedge.com)
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts.slice(-2).join("."); // "stanforteedge.com"
  }

  return hostname;
}

export function getTenantSlugFromHostname(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Check URL query parameters first (convenient for local dev & testing without DNS setup)
  const urlParams = new URLSearchParams(window.location.search);
  const paramSlug = urlParams.get("slug") || urlParams.get("org") || urlParams.get("workspace");
  if (paramSlug && paramSlug.trim()) {
    return paramSlug.trim().toLowerCase();
  }

  // 2. Check hostname subdomains
  const hostname = window.location.hostname;

  // Handle local development: "acme.localhost" or "acme.lvh.me"
  if (hostname.includes(".localhost") || hostname.includes(".lvh.me")) {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const candidate = parts[0].toLowerCase();
      if (!RESERVED_SUBDOMAINS.has(candidate)) {
        return candidate;
      }
    }
  }

  // Handle standard domain: "acme.stanforteedge.com"
  const parts = hostname.split(".");
  if (parts.length > 2) {
    const candidate = parts[0].toLowerCase();
    if (!RESERVED_SUBDOMAINS.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function buildTenantUrl(slug: string, path = "/dashboard"): string {
  if (typeof window === "undefined") {
    return `https://${slug}.stanforteedge.com${path}`;
  }

  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : "";
  const protocol = window.location.protocol;

  if (hostname === "localhost" || hostname.includes("localhost") || hostname === "127.0.0.1") {
    // If browser supports subdomains on localhost
    return `${protocol}//${slug}.localhost${port}${path}`;
  }

  const baseDomain = getProjectBaseDomain();
  return `${protocol}//${slug}.${baseDomain}${port}${path}`;
}

export function formatWorkspaceSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
