import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { db } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
    user_id: number
    username: string
}

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'jwt'
        const decoded = verify(token, JWT_SECRET) as { userId: number }

        const [users] = await db.query<UserRow[]>(
            'SELECT user_id, username FROM users WHERE user_id = ?',
            [decoded.userId]
        )

        if (!Array.isArray(users) || !users.length) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 })
        }

        return NextResponse.json({
            userId: users[0].user_id,
            username: users[0].username
        })
    } catch (error) {
        console.error('获取用户信息失败:', error)
        return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 })
    }
} 