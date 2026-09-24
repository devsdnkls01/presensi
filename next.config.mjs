/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./node_modules/.prisma/client/**/*'],
    },
  },
};

export default nextConfig;
