'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Accordion, AccordionItem, Spinner } from "@nextui-org/react"
import { ChevronLeft, Plus, Settings } from "lucide-react"
import { ArrowDownTrayIcon, ClipboardDocumentIcon, TrashIcon } from '@heroicons/react/24/outline'

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
        const authResponse = await fetch('/api/auth')
        if (!authResponse.ok) {
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
            onPress={() => router.push(`/manage?classId=${params.classId}`)}
          >
            <Settings size={24} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classInfo.photos.map((photo) => (
          <div
            key={photo.photo_id}
            className={`border rounded-lg overflow-hidden relative ${selectedPhotoId === photo.photo_id ? 'brightness-75' : ''}`}
            onClick={() => handleImageClick(photo.photo_id)}
          >
            <img
              src={photo.photo_url}
              alt={`板书 ${photo.photo_id}`}
              className="w-full h-auto"
            />
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
              {/* <div className="text-sm text-gray-600 mb-2">
                拍摄时间: {new Date(photo.created_at).toLocaleString()}
              </div> */}
              <Accordion>
                <AccordionItem
                  key="1"
                  aria-label="分析"
                  title="解析"
                  onPress={async () => {
                    if (!photo.explanation) {
                      const explanation = await fetchExplanation(photo.photo_id)
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
                    {photo.explanation || '暂无分析'}
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 