/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const waServerUrl = process.env.NEXT_PUBLIC_WA_SERVER_URL || 'http://localhost:3001'
    return [
      {
        source: '/wa/:path*',
        destination: `${waServerUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
