const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA({
    images: {
        domains: ['s.jyj.cx']
    },
    // 其他 Next.js 配置
}) 