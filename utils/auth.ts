interface AuthResponse {
    token: string
    user: {
        id: number
        username: string
    }
}

interface ErrorResponse {
    error: string
}

export const authenticate = async (username: string, password: string): Promise<AuthResponse> => {
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        })

        const data = await response.json() as AuthResponse | ErrorResponse

        if (!response.ok) {
            throw new Error('error' in data ? data.error : '认证失败')
        }

        const authData = data as AuthResponse
        localStorage.setItem('token', authData.token)
        localStorage.setItem('user', JSON.stringify(authData.user))
        return authData
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }
        throw new Error('认证失败')
    }
}

export const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/auth'
}

export const getUser = () => {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
} 