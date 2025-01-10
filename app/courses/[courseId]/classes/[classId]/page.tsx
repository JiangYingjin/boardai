'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Accordion, AccordionItem, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react"
import { ChevronLeft, Plus, Settings, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { ArrowDownTrayIcon, ClipboardDocumentIcon, TrashIcon } from '@heroicons/react/24/outline'
import { isAuthenticated } from '@/lib/auth'
import MarkdownRenderer from '@/app/components/MarkdownRenderer'

interface BoardPhoto {
  photo_id: number
  photo_url: string
  created_at: string
  explanation?: string
}

interface ClassInfo {
  class_id: number
  class_date: string
  photos: BoardPhoto[]
}

export default function ClassPage() {
  const params = useParams<{ courseId: string; classId: string }>()
  const router = useRouter()
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null)
  const [expandAll, setExpandAll] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()

  // 添加一个 ref 来追踪组件是否已卸载
  const isUnmounted = useRef(false)

  useEffect(() => {
    return () => {
      isUnmounted.current = true
    }
  }, [])

  useEffect(() => {
    const courseId = params?.courseId
    const classId = params?.classId

    if (!courseId || !classId) {
      setError('无效的课程或课堂ID')
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        const _isAuthenticated = await isAuthenticated()
        if (!_isAuthenticated) {
          router.push('/auth')
          return
        }

        const response = await fetch(`/api/courses/${courseId}/classes/${classId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch class info')
        }

        const data = await response.json()
        setClassInfo(data)
      } catch (err) {
        setError('加载失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [params, router])

  const handleFileSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      const formData = new FormData()

      const courseId = params.courseId
      const classId = params.classId

      files.forEach(file => {
        formData.append('images', file)
        formData.append('creationTimes', file.lastModified.toString())
        formData.append('courseId', courseId)
        formData.append('classId', classId)
      })

      formData.append('classId', params.classId)

      setIsLoading(true)
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('上传失败')
        }

        const data = await response.json()
        router.push(`/courses/${data.courseId}/classes/${data.classId}`)
      } catch (error) {
        console.error('Upload failed:', error)
        alert('上传失败，请重试')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const fetchExplanation = async (photoId: number) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/analysis`)
      if (!response.ok) throw new Error('获取分析失败')
      const data = await response.json()
      return data.explanation
    } catch (error) {
      console.error('获取分析失败:', error)
      return null
    }
  }

  const handleImageClick = (photoId: number) => {
    setSelectedPhotoId(prev => (prev === photoId ? null : photoId))
  }

  const handleCopyExplanation = (explanation: string) => {
    navigator.clipboard.writeText(explanation)
  }

  const handleDelete = async (photoId: number) => {
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        // 更新状态以移除已删除的图片
        setClassInfo(prev => ({
          ...prev!,
          photos: prev!.photos.filter(photo => photo.photo_id !== photoId),
        }))
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleDeleteClass = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/classes/${params.classId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('删除失败')
      }
      router.push(`/courses/${params.courseId}`)
    } catch (error) {
      console.error('删除课堂失败:', error)
    }
  }

  const retryFetchExplanation = async (photoId: number, maxRetries = 60): Promise<string | null> => {
    let retryCount = 0
    let unchangedCount = 0
    let lastExplanation = null

    const pollInterval = setInterval(async () => {
      if (retryCount >= maxRetries) {
        clearInterval(pollInterval)
        return
      }

      const newExplanation = await fetchExplanation(photoId)

      // 检查结果是否与上次相同
      if (newExplanation === lastExplanation) {
        unchangedCount++
        if (unchangedCount >= 10) {
          clearInterval(pollInterval)
          return
        }
      } else {
        unchangedCount = 0
      }

      if (newExplanation) {
        lastExplanation = newExplanation
        setClassInfo(prev => ({
          ...prev!,
          photos: prev!.photos.map(p =>
            p.photo_id === photoId
              ? { ...p, explanation: newExplanation }
              : p
          )
        }))

        if (!newExplanation.endsWith('...')) {
          clearInterval(pollInterval)
        }
      }

      retryCount++
    }, 1000)

    return null
  }

  const toggleAllExplanations = async () => {
    setExpandAll(prev => !prev)

    if (!expandAll) {
      // 展开所有
      const newKeys = new Set(classInfo?.photos.map(photo => `${photo.photo_id}-explanation`))
      setExpandedKeys(newKeys)

      // 获取所有未加载解析的图片
      const photosWithoutExplanation = classInfo?.photos.filter(photo => !photo.explanation) || []

      // 并行获取所有未加载的解析
      const explanationPromises = photosWithoutExplanation.map(async (photo) => {
        const explanation = await retryFetchExplanation(photo.photo_id)
        if (explanation) {
          setClassInfo(prev => ({
            ...prev!,
            photos: prev!.photos.map(p =>
              p.photo_id === photo.photo_id
                ? { ...p, explanation }
                : p
            )
          }))
        }
      })

      await Promise.all(explanationPromises)
    } else {
      // 折叠所有
      setExpandedKeys(new Set())
    }
  }

  if (loading) return null
  if (error) return <div>错误: {error}</div>
  if (!classInfo) return <div>未找到课堂信息</div>

  return (
    <div className="p-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelectAndUpload}
      />
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="light"
          isIconOnly
          onPress={() => router.push(`/courses/${params.courseId}`)}
        >
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold">
          {new Date(classInfo.class_date).toLocaleDateString()}
        </h1>
        <div className="flex space-x-2">
          <Button
            variant="light"
            isIconOnly
            onPress={() => fileInputRef.current?.click()}
            isLoading={isLoading}
          >
            <Plus size={24} />
          </Button>
          <Button
            variant="light"
            isIconOnly
            onPress={toggleAllExplanations}
          >
            {expandAll ? <ChevronUpIcon size={24} /> : <ChevronDownIcon size={24} />}
          </Button>
          <Button
            variant="light"
            isIconOnly
            onPress={onMenuOpen}
          >
            <Settings size={24} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classInfo.photos.map((photo) => (
          <div
            key={photo.photo_id}
            className="border rounded-lg overflow-hidden relative"
          >
            <div
              className={`cursor-pointer ${selectedPhotoId === photo.photo_id ? 'brightness-75' : ''}`}
              onClick={() => handleImageClick(photo.photo_id)}
            >
              <img
                src={photo.photo_url}
                alt={`板书 ${photo.photo_id}`}
                className="w-full h-auto"
              />
            </div>
            {selectedPhotoId === photo.photo_id && (
              <div className="absolute top-2 right-2 flex space-x-4">
                <button onClick={() => handleCopyExplanation(photo.explanation || '')}>
                  <ClipboardDocumentIcon className="w-8 h-8" />
                </button>
                <button onClick={() => handleDelete(photo.photo_id)}>
                  <TrashIcon className="w-8 h-8" />
                </button>
              </div>
            )}
            <div className="p-2">
              <Accordion
                selectedKeys={expandedKeys}
                onSelectionChange={(keys) => setExpandedKeys(new Set(Array.from(keys).map(String)))}
              >
                <AccordionItem
                  key={`${photo.photo_id}-explanation`}
                  aria-label="分析"
                  title="解析"
                  onPress={async () => {
                    if (!photo.explanation) {
                      const explanation = await retryFetchExplanation(photo.photo_id)
                      if (explanation) {
                        setClassInfo(prev => ({
                          ...prev!,
                          photos: prev!.photos.map(p =>
                            p.photo_id === photo.photo_id
                              ? { ...p, explanation }
                              : p
                          )
                        }))
                      }
                    }
                  }}
                >
                  <div className="text-sm">
                    {photo.explanation ? (
                      <MarkdownRenderer content={photo.explanation} />
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isMenuOpen} onClose={onMenuClose} size="sm">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">课堂管理</ModalHeader>
          <ModalBody>
            <Button
              color="danger"
              variant="light"
              onPress={() => {
                onMenuClose()
                onDeleteOpen()
              }}
              startContent={<TrashIcon className="h-5 w-5" />}
            >
              删除课堂
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader className="text-danger">删除课堂</ModalHeader>
          <ModalBody>
            <p>确定要删除该课堂吗？此操作无法撤销。</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              取消
            </Button>
            <Button color="danger" onPress={handleDeleteClass}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
} 