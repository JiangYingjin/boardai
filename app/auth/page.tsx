'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@nextui-org/react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    console.log('=== Login Start ===')
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('Sending login request...')
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      console.log('Login response status:', response.status)

      if (response.ok) {
        
        console.log('Login successful, redirecting to /courses')
        router.push('/courses')
      } else {
        const data = await response.json()
        console.log('Login failed:', data)
        setError(data.error || '登录失败')
      }
    } catch {
      console.error('Login request failed')
      setError('登录失败，请重试')
    } finally {
      setIsLoading(false)
      console.log('=== Login End ===')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 p-4">
        <Input
          label="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          label="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <div className="text-danger text-sm">{error}</div>
        )}
        <Button
          type="submit"
          color="primary"
          isLoading={isLoading}
          className="w-full"
        >
          登录
        </Button>
      </form>
    </div>
  )
}