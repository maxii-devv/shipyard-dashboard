import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // `standalone` emits a minimal self-contained server bundle under
  // `.next/standalone/`, which is what the Docker image runs. Without this the
  // Dockerfile would have to ship the whole node_modules tree.
  output: 'standalone',
  transpilePackages: ['@excalidraw/excalidraw'],
  turbopack: {
    root: __dirname,
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss: path.resolve(__dirname, 'node_modules/tailwindcss'),
    };
    return config;
  },
};

export default nextConfig;
