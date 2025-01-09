'use client'

import React from 'react'
import { useEffect, useState } from 'react'
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
} from "@nextui-org/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline"

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
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()

  const { courseId } = params

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`)
        const data = await response.json()
        setCourse(data)
      } catch (error) {
        console.error('获取课程数据时出错:', error)
      }
    }

    fetchCourse()
  }, [courseId])

  const handleDelete = async () => {
    try {
      await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      })
      router.push('/courses')
    } catch (error) {
      console.error('删除课程时出错:', error)
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
    <div className="min-h-screen bg-gray-50">
      <Navbar className="shadow-sm">
        <NavbarContent justify="start">
          <Button
            isIconOnly
            variant="light"
            onPress={() => router.push('/courses')}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <NavbarBrand>
            <p className="font-bold text-xl">{course.course_name}</p>
          </NavbarBrand>
        </NavbarContent>
        <NavbarContent justify="end">
          <Button
            isIconOnly
            variant="light"
            onPress={() => setShowLongDesc(!showLongDesc)}
          >
            {showLongDesc ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </Button>
          <Button
            isIconOnly
            variant="light"
            onPress={onMenuOpen}
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </Button>
        </NavbarContent>
      </Navbar>

      <div className="p-4">
        <div className="space-y-4">
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
                  className="w-full"
                >
                  <CardBody className="p-5">
                    <h2 className="text-xl font-semibold mb-2">{classItem.title}</h2>
                    <p className="text-sm text-gray-500 mb-3">
                      {formatDate(classItem.class_date)}
                    </p>
                    <p className="text-gray-700">
                      {showLongDesc ? classItem.long_description : classItem.short_description}
                    </p>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 课程管理菜单 */}
      <Modal isOpen={isMenuOpen} onClose={onMenuClose} size="sm">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">课程管理</ModalHeader>
          <ModalBody>
            <Button
              color="danger"
              variant="light"
              onPress={() => {
                onMenuClose()
                onDeleteOpen()
              }}
              startContent={<TrashIcon className="w-5 h-5" />}
            >
              删除课程
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader className="text-danger">删除课程</ModalHeader>
          <ModalBody>
            <p>确定要删除课程 &quot;{course.course_name}&quot; 吗？此操作无法撤销。</p>
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