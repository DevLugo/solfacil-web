import type { NextConfig } from 'next'

// Get Cloudinary cloud name from environment variable
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Only validate when actually building the web app (not when API builds dependencies)
const isWebBuild = process.env.npm_lifecycle_event === 'build' || process.env.VERCEL === '1'

if (isWebBuild && !cloudinaryCloudName) {
  throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable is required')
}

const nextConfig: NextConfig = {
  transpilePackages: [
    '@solufacil/shared',
    '@solufacil/graphql-schema',
    '@solufacil/business-logic',
  ],
  images: {
    remotePatterns: cloudinaryCloudName ? [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: `/${cloudinaryCloudName}/**`,
      },
    ] : [],
  },
}

export default nextConfig
