const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
    // Allow native Node/NAPI package to be required at runtime for server-only routes
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Ensure native .node binary stays external and is loaded at runtime
      config.externals.push('@napi-rs/canvas');
    }
    return config;
  },
};

module.exports = nextConfig;
