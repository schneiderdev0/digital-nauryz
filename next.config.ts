import type { NextConfig } from "next";

const allowedDevOrigins = [
  "*.trycloudflare.com",
  "*.ngrok-free.app",
  "*.ngrok-free.dev"
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  allowedDevOrigins
};

export default nextConfig;
