import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

export async function GET() {
    try {
        // 从 cookie 中获取 token
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        // 解析 token 获取 userId
        const decoded = verify(token, JWT_SECRET) as { userId: number }
        const userId = decoded.userId

        const [courses] = await db.query(
            'SELECT course_id, course_name FROM courses WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        )

        return NextResponse.json(courses)
    } catch (error) {
        console.error('Failed to fetch courses:', error)
        return NextResponse.json({ error: '获取课程失败' }, { status: 500 })
    }
}