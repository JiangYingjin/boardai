'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input } from '@nextui-org/react'
import { PlusCircleIcon, PhotoIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

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

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* 顶部导航栏 */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-10">
        <Button
          isIconOnly
          variant="light"
          onPress={() => router.back()}
          className="mr-4"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
        </Button>
        <h1 className="text-lg font-medium">上传板书</h1>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-col items-center px-4 pt-24 pb-32 max-w-2xl mx-auto space-y-8">
        {/* 文件选择区域 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFiles.length ? (
          <div className="w-full">
            <button
              onClick={triggerFileSelect}
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl 
                hover:border-primary hover:bg-primary/5 transition-all duration-200 
                flex flex-col items-center justify-center gap-4 group
                shadow-sm hover:shadow-md"
            >
              <div className="p-4 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-200">
                <PhotoIcon className="w-8 h-8 text-primary/70 group-hover:text-primary transition-colors duration-200" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-gray-700 group-hover:text-primary transition-colors duration-200 font-medium">
                  点击选择板书照片
                </p>
                <p className="text-sm text-gray-500">
                  支持多张照片上传
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                  <PhotoIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-lg font-medium">
                  已选择 {selectedFiles.length} 张板书照片
                </div>
              </div>
              <Button
                size="sm"
                variant="light"
                onPress={triggerFileSelect}
                className="text-primary"
              >
                重新选择
              </Button>
            </div>
          </div>
        )}

        {/* 课程选择区域 */}
        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-medium text-gray-700">选择课程</h2>
          <div className="flex items-center gap-2">
            {isCreatingNewCourse ? (
              <Input
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="输入新课程名称"
                className="flex-1"
                size="lg"
                variant="bordered"
                classNames={{
                  input: "h-12",
                  inputWrapper: "h-12"
                }}
              />
            ) : (
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    className="w-full justify-between h-12"
                    variant="bordered"
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
              variant="light"
              onPress={() => {
                setIsCreatingNewCourse(!isCreatingNewCourse)
                setSelectedCourse(null)
                setNewCourseName('')
              }}
              className="h-12 w-12 min-w-12 transition-transform hover:scale-105 hover:bg-gray-100"
            >
              <PlusCircleIcon className={`w-5 h-5 transition-transform duration-200 ${isCreatingNewCourse ? 'rotate-45' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={isLoading}
            className="w-full h-12 font-medium text-base shadow-lg"
            size="lg"
          >
            保存板书
          </Button>
        </div>
      </div>
    </div>
  )
} 