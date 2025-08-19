/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  trailingSlash: false,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../')
  }
}

module.exports = nextConfig
