/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // better-sqlite3 是原生模块，交给 Node.js 运行时直接加载，不参与打包
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
