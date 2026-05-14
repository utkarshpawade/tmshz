/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained `.next/standalone/server.js` for a tiny Docker image.
  output: "standalone",
  // Next.js BFF route handlers proxy to FastAPI (wired in Phase 5).
  env: {
    FASTAPI_URL: process.env.FASTAPI_URL || "http://localhost:8000",
  },
};

module.exports = nextConfig;
