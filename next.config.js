/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'admin.lexashield.com',
        pathname: '/**',
      },
    ],
  },
  // Build optimizations to prevent stack overflow
  experimental: {
    // Reduce build tracer complexity
    outputFileTracingRoot: undefined,
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        'node_modules/@next/swc-linux-x64-gnu',
        'node_modules/@next/swc-linux-x64-musl',
      ],
    },
  },
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Reduce bundle size and complexity
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },
  // Output optimization
  output: 'standalone',
}

module.exports = nextConfig
