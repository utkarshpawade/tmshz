// Load the project-root .env (one level up) so the frontend can share
// NEXT_PUBLIC_TOMTOM_API_KEY (and any other secrets) with the backend
// in local dev without duplicating the file. On Vercel the parent .env
// doesn't exist — env vars set in the Vercel dashboard take over and
// the dotenv call silently no-ops.
const path = require("path");
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch {
  // dotenv not installed or parent .env missing — fine in production.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    FASTAPI_URL: process.env.FASTAPI_URL || "http://localhost:8000",
    // Re-export NEXT_PUBLIC_* loaded from the parent .env so they reach
    // the client bundle when running locally. On Vercel, NEXT_PUBLIC_*
    // vars set in the project settings are inlined automatically.
    NEXT_PUBLIC_TOMTOM_API_KEY: process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "",
  },
};

module.exports = nextConfig;
