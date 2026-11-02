/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 图片走 next/image 运行时优化（本地 public 目录资源），不再全局关闭优化
  images: {
    formats: ['image/webp'],
  },
  // better-sqlite3 是原生模块，交给 Node.js 运行时直接加载，不参与打包
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
