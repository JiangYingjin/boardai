'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardBody,
  Button,
  Navbar,
  NavbarContent,
  NavbarBrand,
} from "@nextui-org/react"
import { motion } from "framer-motion"

interface Course {
  course_id: string
  course_name: string
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])

  const isAuthenticated = async () => {
    const response = await fetch('/api/auth')
    const _isAuthenticated = await response.json()
    return _isAuthenticated
  }

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        console.log('开始验证用户身份...')
        const _isAuthenticated = await isAuthenticated()
        console.log('用户身份验证结果:', _isAuthenticated)

        if (!_isAuthenticated) {
          console.log('未登录,正在跳转到登录页面...')
          router.push('/auth')
          return
        }

        console.log('用户已登录')
        fetchCourses()
      } catch (error) {
        console.error('验证登录状态时出错:', error)
        router.push('/auth')
      }
    }

    const fetchCourses = async () => {
      try {
        console.log('开始获取课程数据...')
        const response = await fetch('/api/courses')
        console.log('课程数据请求已发送, 等待响应...')
        const data = await response.json()
        console.log('课程数据已接收:', data)
        setCourses(data)
      } catch (error) {
        console.error('获取课程数据时出错:', error)
      }
    }

    console.log('组件挂载, 开始验证和获取数据流程...')
    verifyAuth()
  }, [router])

  console.log('渲染课程页面, 当前课程数量:', courses.length)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar className="shadow-sm">
        <NavbarContent>
          <NavbarBrand>
            <p className="font-bold text-xl">课程</p>
          </NavbarBrand>
        </NavbarContent>
      </Navbar>

      <div className="p-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {courses.map(course => (
            <motion.div
              key={course.course_id}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <Card
                isPressable
                onPress={() => router.push(`/courses/${course.course_id}`)}
                className="w-full"
              >
                <CardBody className="p-5">
                  <h2 className="text-xl font-semibold">{course.course_name}</h2>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        <Button
          isIconOnly
          color="primary"
          size="lg"
          className="fixed bottom-8 right-8 shadow-lg w-16 h-16 text-3xl"
          onClick={() => router.push('/upload')}
        >
          +
        </Button>
      </div>
    </div>
  )
}