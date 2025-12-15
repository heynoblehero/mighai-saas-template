/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  output: 'standalone',
  trailingSlash: false,
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname)
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    emotion: false,
    styledComponents: false,
  },
  // Don't try to statically generate API routes
  exportPathMap: async function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    const paths = {};
    // Only include actual pages, not API routes
    Object.keys(defaultPathMap).forEach(key => {
      if (!key.startsWith('/api') && !key.startsWith('/api-public')) {
        paths[key] = defaultPathMap[key];
      }
    });
    return paths;
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
      
      // Ignore server-only modules on client side
      config.externals = [
        ...(config.externals || []),
        'better-sqlite3',
        'fs',
        'path',
        'os'
      ];
    }
    return config;
  },
}

module.exports = nextConfig