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
import { motion, AnimatePresence } from "framer-motion"
import { isAuthenticated } from '@/lib/auth'
import { PlusIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar
        className="h-16 backdrop-blur-md bg-white/70 border-b border-gray-100 sticky top-0 z-30"
        maxWidth="lg"
      >
        <NavbarContent>
          <NavbarBrand>
            <p className="font-semibold text-xl tracking-tight">我的课程</p>
          </NavbarBrand>
        </NavbarContent>
        <NavbarContent justify="end">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                className="rounded-full"
              >
                <EllipsisVerticalIcon className="w-5 h-5 text-gray-700" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="用户菜单"
              className="w-56"
            >
              <DropdownItem
                key="profile"
                className="h-14 gap-2"
                textValue="用户信息"
              >
                <div className="flex flex-col">
                  <p className="font-medium text-sm">当前用户</p>
                  <p className="text-sm text-gray-500">{username}</p>
                </div>
              </DropdownItem>
              <DropdownItem key="password" onPress={onOpen}>
                修改密码
              </DropdownItem>
              <DropdownItem
                key="logout"
                className="text-danger"
                color="danger"
                onPress={handleLogout}
              >
                注销
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </Navbar>

      <div className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {courses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <p className="text-gray-500">还没有课程，点击右下角添加</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-6 grid-cols-1 md:grid-cols-2"
            >
              {courses.map((course, index) => (
                <motion.div
                  key={course.course_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <Card
                    isPressable
                    onPress={() => router.push(`/courses/${course.course_id}`)}
                    className="w-full bg-white/70 backdrop-blur-sm hover:bg-white transition-all duration-200"
                    shadow="sm"
                  >
                    <CardBody className="p-6">
                      <h2 className="text-xl font-medium tracking-tight">{course.course_name}</h2>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Button
            isIconOnly
            color="primary"
            size="lg"
            className="fixed bottom-8 right-8 shadow-lg w-14 h-14 rounded-full hover:scale-110 transition-transform"
            onClick={() => router.push('/upload')}
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
        </motion.div>
      </div>

      {/* 修改密码弹窗 */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        classNames={{
          base: "bg-white/80 backdrop-blur-md border border-gray-200",
          header: "border-b border-gray-100",
          body: "py-6",
          footer: "border-t border-gray-100"
        }}
      >
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
    </div>
  )
}