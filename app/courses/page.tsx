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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
} from "@nextui-org/react"
import { motion } from "framer-motion"
import { isAuthenticated } from '@/lib/auth'
import { MoreVertical } from "lucide-react"

interface Course {
  course_id: string
  course_name: string
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [username, setUsername] = useState<string>('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

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

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user')
        const data = await response.json()
        setUsername(data.username)
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }
    fetchUserInfo()
  }, [])

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '修改密码失败')
      }

      onClose()
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth')
    } catch (error) {
      console.error('注销失败:', error)
    }
  }

  console.log('渲染课程页面, 当前课程数量:', courses.length)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar className="shadow-sm">
        <NavbarContent>
          <NavbarBrand>
            <p className="font-bold text-xl">课程</p>
          </NavbarBrand>
        </NavbarContent>
        <NavbarContent justify="end">
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light">
                <MoreVertical />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="用户菜单">
              <DropdownItem key="username" className="h-14 gap-2">
                <p className="font-semibold">当前用户</p>
                <p className="text-default-500">{username}</p>
              </DropdownItem>
              <DropdownItem key="password" onPress={onOpen}>
                修改密码
              </DropdownItem>
              <DropdownItem key="logout" className="text-danger" color="danger" onPress={handleLogout}>
                注销
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </Navbar>

      {/* 修改密码弹窗 */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>修改密码</ModalHeader>
          <ModalBody>
            {error && <p className="text-danger text-sm mb-2">{error}</p>}
            <Input
              type="password"
              label="当前密码"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mb-2"
            />
            <Input
              type="password"
              label="新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-2"
            />
            <Input
              type="password"
              label="确认新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleChangePassword}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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