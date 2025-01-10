import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
    password: string
}

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'jwt'
        const decoded = verify(token, JWT_SECRET) as { userId: number }

        const { oldPassword, newPassword } = await request.json()

        // 验证旧密码
        const [users] = await db.query<UserRow[]>(
            'SELECT password FROM users WHERE user_id = ?',
            [decoded.userId]
        )

        if (!Array.isArray(users) || !users.length) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 })
        }

        const isValidPassword = await bcrypt.compare(oldPassword, users[0].password)
        if (!isValidPassword) {
            return NextResponse.json({ error: '当前密码错误' }, { status: 400 })
        }

        // 更新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await db.query(
            'UPDATE users SET password = ? WHERE user_id = ?',
            [hashedPassword, decoded.userId]
        )

        return NextResponse.json({ message: '密码修改成功' })
    } catch (error) {
        console.error('修改密码失败:', error)
        return NextResponse.json({ error: '修改密码失败' }, { status: 500 })
    }
} 