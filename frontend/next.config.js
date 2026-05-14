// Load the project-root .env (one level up) so the frontend can share
// NEXT_PUBLIC_TOMTOM_API_KEY (and any other secrets) with the backend
// without duplicating the file. Local frontend/.env.local still wins.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained `.next/standalone/server.js` for a tiny Docker image.
  output: "standalone",
  env: {
    FASTAPI_URL: process.env.FASTAPI_URL || "http://localhost:8000",
    // Re-export NEXT_PUBLIC_* loaded from the parent .env so they reach
    // the client bundle. (Next only auto-inlines NEXT_PUBLIC_* discovered
    // in its own dotenv chain.)
    NEXT_PUBLIC_TOMTOM_API_KEY: process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "",
  },
};

module.exports = nextConfig;
