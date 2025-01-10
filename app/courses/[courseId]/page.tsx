'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Navbar,
  NavbarContent,
  NavbarBrand,
  Button,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@nextui-org/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeftIcon,
  EllipsisHorizontalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline"
import { isAuthenticated } from '@/lib/auth'
import MarkdownRenderer from '@/app/components/MarkdownRenderer'

interface Class {
  class_id: number
  title: string
  class_date: string
  short_description: string
  long_description: string
}

interface Course {
  course_id: string
  course_name: string
  classes: Class[]
}

export default function CoursePage() {
  const router = useRouter()
  const params = useParams<{ courseId: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [showLongDesc, setShowLongDesc] = useState(false)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure()
  const [newCourseName, setNewCourseName] = useState('')

  const { courseId } = params

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const _isAuthenticated = await isAuthenticated()
        if (!_isAuthenticated) {
          router.push('/auth')
          return
        }
        await fetchCourse()
      } catch (error) {
        console.error('验证登录状态时出错:', error)
        router.push('/auth')
      }
    }

    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/courses?action=getCourse&courseId=${courseId}`)
        const data = await response.json()
        setCourse(data)
      } catch (error) {
        console.error('获取课程数据时出错:', error)
      }
    }

    verifyAuth()
  }, [courseId, router])

  const handleDelete = async () => {
    try {
      await fetch(`/api/courses?action=deleteCourse&courseId=${courseId}`, {
        method: 'POST',
      })
      router.push('/courses')
    } catch (error) {
      console.error('删除课程时出错:', error)
    }
  }

  const handleRename = async () => {
    try {
      const response = await fetch(`/api/courses?action=updateCourse&courseId=${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseName: newCourseName }),
      })

      if (!response.ok) throw new Error('更新失败')

      setCourse(prev => prev ? { ...prev, course_name: newCourseName } : null)
      onRenameClose()
    } catch (error) {
      console.error('更新课程名称失败:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  if (!course) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar
        className="h-16 backdrop-blur-md bg-white/70 border-b border-gray-100"
        maxWidth="lg"
      >
        <NavbarContent justify="start">
          <Button
            isIconOnly
            variant="light"
            className="rounded-full"
            onPress={() => router.push('/courses')}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Button>
          <NavbarBrand>
            <p className="font-medium text-xl tracking-tight">{course.course_name}</p>
          </NavbarBrand>
        </NavbarContent>
        <NavbarContent justify="end">
          <Button
            variant="light"
            isIconOnly
            className="rounded-full"
            onPress={() => setShowLongDesc(!showLongDesc)}
          >
            {showLongDesc ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </Button>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                className="rounded-full"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="课程管理"
              className="w-56"
            >
              <DropdownItem
                key="rename"
                onPress={() => {
                  setNewCourseName(course.course_name)
                  onRenameOpen()
                }}
              >
                修改课程名称
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                onPress={onDeleteOpen}
              >
                删除课程
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </Navbar>

      <div className="max-w-5xl mx-auto p-6">
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {course.classes.map((classItem) => (
              <motion.div
                key={classItem.class_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  isPressable
                  onPress={() => router.push(`/courses/${courseId}/classes/${classItem.class_id}`)}
                  className="w-full bg-white/70 backdrop-blur-sm hover:bg-white"
                  shadow="sm"
                >
                  <CardBody className="p-6">
                    <h2 className="text-xl font-medium tracking-tight mb-2">
                      {classItem.title || formatDate(classItem.class_date)}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      {formatDate(classItem.class_date)}
                    </p>
                    <div className="prose prose-sm max-w-none text-gray-600">
                      <MarkdownRenderer
                        content={showLongDesc ? classItem.long_description : classItem.short_description}
                      />
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals with consistent styling */}
      <Modal
        isOpen={isRenameOpen}
        onClose={onRenameClose}
        classNames={{
          base: "bg-white border border-gray-200",
          header: "border-b border-gray-100",
          body: "py-6",
          footer: "border-t border-gray-100"
        }}
      >
        <ModalContent>
          <ModalHeader className="font-medium">修改课程名称</ModalHeader>
          <ModalBody>
            <Input
              label="课程名称"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              variant="bordered"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onRenameClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleRename}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        classNames={{
          base: "bg-white border border-gray-200",
          header: "border-b border-gray-100",
          body: "py-6",
          footer: "border-t border-gray-100"
        }}
      >
        <ModalContent>
          <ModalHeader className="font-medium text-danger">删除课程</ModalHeader>
          <ModalBody>
            <p className="text-gray-600">
              确定要删除课程 <span className="font-medium text-gray-900">{course.course_name}</span> 吗？此操作无法撤销。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              取消
            </Button>
            <Button color="danger" onPress={handleDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
} 