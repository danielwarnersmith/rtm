import { withContentlayer } from "next-contentlayer2";

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const isGithubPages =
  process.env.GITHUB_PAGES === "true" || process.env.GITHUB_ACTIONS === "true";
const repo = process.env.GITHUB_REPOSITORY?.split("/")?.[1];
const basePath = isGithubPages && repo ? `/${repo}` : "";

const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Enable static export for production builds only (needed for Pagefind indexing)
  // In development, we need dynamic routing to work normally
  ...(isProd && { output: "export" }),
  ...(isGithubPages && basePath
    ? {
        // GitHub Pages serves from a repo subpath (e.g. /rtm/)
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
      }
    : {}),
  ...(isProd && {
    // next/image optimization doesn't work with static export hosts like Pages
    images: { unoptimized: true },
  }),
};

// Wrap config with Contentlayer for MDX content processing
export default withContentlayer(nextConfig);

