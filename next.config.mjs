import { withContentlayer } from "next-contentlayer2";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
};

// Wrap config with Contentlayer for MDX content processing
export default withContentlayer(nextConfig);

