/**
 * Base path utilities for GitHub Pages deployment.
 *
 * When deployed to GitHub Pages, the site is served from a subpath (e.g., /rtm/).
 * These utilities handle prefixing URLs with the correct base path.
 */

/**
 * Get the base path for the application.
 *
 * Checks for:
 * 1. Explicit NEXT_PUBLIC_BASE_PATH environment variable
 * 2. GitHub Pages/Actions environment variables
 *
 * @returns The base path string, or empty string for root deployment
 */
export function getBasePath(): string {
  // Prefer explicit public base path when present (available in browser bundles).
  const explicit = process.env.NEXT_PUBLIC_BASE_PATH;
  if (explicit) return explicit;

  // Fall back to the same GitHub Pages detection as `next.config.mjs`.
  const isGithubPages =
    process.env.GITHUB_PAGES === "true" || process.env.GITHUB_ACTIONS === "true";
  const repo = process.env.GITHUB_REPOSITORY?.split("/")?.[1];
  return isGithubPages && repo ? `/${repo}` : "";
}

/**
 * Cached base path value.
 */
export const BASE_PATH = getBasePath();

/**
 * Prefix a URL with the base path if needed.
 *
 * Only prefixes absolute root paths (starting with `/`).
 * Leaves external URLs, data URLs, and relative paths unchanged.
 *
 * @param src - The URL to prefix
 * @returns The URL with base path prefix, or unchanged if not applicable
 */
export function withBasePath(src: string | undefined): string | undefined {
  if (!src) return src;

  // External/data URLs should remain untouched.
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:") || src.startsWith("mailto:")) {
    return src;
  }

  // Only prefix absolute root paths.
  if (!src.startsWith("/")) return src;
  if (!BASE_PATH) return src;
  if (src.startsWith(`${BASE_PATH}/`)) return src;

  return `${BASE_PATH}${src}`;
}

