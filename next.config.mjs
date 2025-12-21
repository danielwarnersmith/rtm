import { withContentlayer } from "next-contentlayer2";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Enable static export for production builds only (needed for Pagefind indexing)
  // In development, we need dynamic routing to work normally
  ...(process.env.NODE_ENV === "production" && { output: "export" }),
};

// Wrap config with Contentlayer for MDX content processing
export default withContentlayer(nextConfig);

