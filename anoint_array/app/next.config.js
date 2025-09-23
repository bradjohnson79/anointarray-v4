const path = require('path');

/** @type {import('next').NextConfig} */
const isVercel = !!process.env.VERCEL;

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  experimental: {
    // In Vercel, rely on default file tracing to avoid missing internal Next runtime files
    ...(isVercel ? {} : { outputFileTracingRoot: path.join(__dirname, '../') }),
    // Allow native Node/NAPI package to be required at runtime for server-only routes
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
    // Exclude large local knowledge base from Serverless bundles to avoid 250MB limit
    // Routes that need KB should fetch from storage instead (temporary until moved)
    outputFileTracingExcludes: {
      '*': ['data/support-kb/**']
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      // Removed legacy Supabase host allowance
      { protocol: 'https', hostname: '**.vercel-storage.com' },
    ],
  },
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
