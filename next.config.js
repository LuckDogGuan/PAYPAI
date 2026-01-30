const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const dotenvShim = path.resolve(__dirname, 'src/lib/shims/dotenv-browser.ts');
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        dotenv: dotenvShim,
        'dotenv/config': dotenvShim,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
