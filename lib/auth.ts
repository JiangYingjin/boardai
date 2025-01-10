export const isAuthenticated = async () => {
    const response = await fetch('/api/auth')
    return response.status === 200
}