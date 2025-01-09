'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input } from '@nextui-org/react'
import { PlusCircleIcon } from '@heroicons/react/24/outline'

interface Course {
  course_id: number
  course_name: string
}

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 获取用户的课程列表
  useEffect(() => {
    fetchCourses()
  }, [])

  // 自动触发文件选择
  useEffect(() => {
    fileInputRef.current?.click()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setSelectedFiles(files)
    } else {
      router.back()
    }
  }

  const handleSave = async () => {
    if (!selectedFiles.length || (!selectedCourse && !newCourseName)) {
      alert('请选择照片和课程')
      return
    }

    setIsLoading(true)
    const formData = new FormData()

    selectedFiles.forEach(file => {
      formData.append('images', file)
      // 添加文件创建时间
      formData.append('creationTimes', file.lastModified.toString())
    })

    // 添加课程信息
    if (isCreatingNewCourse) {
      formData.append('newCourseName', newCourseName)
    } else if (selectedCourse) {
      formData.append('courseId', selectedCourse.course_id.toString())
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const data = await response.json()
      // 跳转到对应课堂页面
      router.push(`/courses/${data.courseId}/classes/${data.classId}`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('上传失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFiles.length > 0 && (
        <div className="text-lg">
          已选择 {selectedFiles.length} 张板书照片
        </div>
      )}

      <div className="w-full max-w-md flex items-center gap-2">
        {isCreatingNewCourse ? (
          <Input
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="输入新课程名称"
            className="flex-1"
          />
        ) : (
          <Dropdown>
            <DropdownTrigger>
              <Button
                className="w-full justify-between"
                disabled={courses.length === 0}
              >
                {selectedCourse?.course_name || (courses.length === 0 ? '暂无课程' : '选择课程')}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="课程列表"
              selectionMode="single"
              selectedKeys={selectedCourse ? [selectedCourse.course_id.toString()] : []}
              onSelectionChange={(keys) => {
                const courseId = Number([...keys][0])
                setSelectedCourse(courses.find(c => c.course_id === courseId) || null)
              }}
            >
              {courses.map((course) => (
                <DropdownItem key={course.course_id}>
                  {course.course_name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        )}

        <Button
          isIconOnly
          onPress={() => {
            setIsCreatingNewCourse(!isCreatingNewCourse)
            setSelectedCourse(null)
            setNewCourseName('')
          }}
        >
          <PlusCircleIcon className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex gap-4">
        <Button
          color="primary"
          onPress={handleSave}
          isLoading={isLoading}
          className="px-8"
        >
          保存
        </Button>
        <Button
          color="default"
          onPress={() => router.back()}
        >
          返回
        </Button>
      </div>
    </div>
  )
} 