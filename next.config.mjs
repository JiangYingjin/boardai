import withPWA from 'next-pwa'

const nextConfig = {
  images: {
    domains: ['s.jyj.cx']
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'mysql2']
    return config
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // 添加一些推荐的 PWA 配置
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
})(nextConfig)
