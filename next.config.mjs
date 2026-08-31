/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    outputFileTracingIncludes: {
      '/boarding/[file]': ['./boarding/**'],
    },
  },
};

export default nextConfig;
