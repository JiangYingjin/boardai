'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/utils/auth'
import { AddButton } from '@/components/AddButton'

export default function CoursesPage() {
  const router = useRouter()

  useEffect(() => {
    const verifyAuth = async () => {
      try {

        if (!await isAuthenticated()) {
          console.log('未登录,正在跳转到登录页面...')
          router.push('/auth')
          return
        }

        console.log('用户已登录')
      } catch (error) {
        console.error('验证登录状态时出错:', error)
        router.push('/auth')
      }
    }

    verifyAuth()
  }, [router])

  return (
    <div className="min-h-screen p-4">
      {/* 课程列表 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* 课程卡片将在这里渲染 */}
      </div>

      {/* 新的添加按钮 */}
      <AddButton />
    </div>
  )
}