'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/utils/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 如果已登录，直接跳转到课程页面
    if (isAuthenticated()) {
      router.push('/courses')
    } else {
      router.push('/auth')
    }
  }, [router])

  return null  // 不需要渲染任何内容，因为会立即重定向
}
