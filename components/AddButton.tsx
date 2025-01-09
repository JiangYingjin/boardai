'use client'

import { Button } from '@nextui-org/react'
import { useRouter } from 'next/navigation'

export function AddButton() {
  const router = useRouter()

  return (
    <Button
      isIconOnly
      color="primary"
      onPress={() => router.push('/upload')}
      className="fixed bottom-6 right-6 rounded-full"
    >
      <PlusIcon />
    </Button>
  )
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  )
} 