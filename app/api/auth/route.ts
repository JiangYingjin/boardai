import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/utils/db'
import jwt from 'jsonwebtoken'
import { User } from '@/types/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { testConnection } from '@/utils/db'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

type UserRow = User & RowDataPacket

interface DbError extends Error {
    code?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number, username: string }
        const [rows] = await pool.query<UserRow[]>(
            'SELECT user_id FROM users WHERE user_id = ?',
            [decoded.userId]
        )

        if (!rows[0]) {
            return NextResponse.json({ error: '用户不存在' }, { status: 401 })
        }

        return NextResponse.json({ userId: rows[0].user_id, username: decoded.username })
    } catch (error) {
        console.error('认证失败:', error)
        return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }
}

export async function POST(request: Request) {
    try {
        if (!await testConnection()) {
            return NextResponse.json({ error: '数据库连接失败' }, { status: 500 })
        }

        const { username, password } = await request.json()

        // 验证输入
        if (!username || username.length < 3) {
            return NextResponse.json({ error: '用户名至少需要3个字符' }, { status: 400 })
        }
        if (!password || password.length < 5) {
            return NextResponse.json({ error: '密码至少需要5个字符' }, { status: 400 })
        }

        // 先尝试查找用户
        const [rows] = await pool.execute<UserRow[]>(
            'SELECT user_id, username, password FROM users WHERE username = ?',
            [username]
        )

        let userId: number

        if (rows.length > 0) {
            // 用户存在，验证密码
            const user = rows[0]
            const isValid = await bcrypt.compare(password, user.password)
            if (!isValid) {
                return NextResponse.json({ error: '密码错误' }, { status: 401 })
            }
            userId = user.user_id
        } else {
            // 用户不存在，创建新用户
            const hashedPassword = await bcrypt.hash(password, 10)
            const [result] = await pool.execute<ResultSetHeader>(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword]
            )
            userId = result.insertId
        }

        // 生成永久有效的 JWT token
        const token = jwt.sign(
            { userId, username },
            process.env.JWT_SECRET || 'jwt'
        )

        // 将 token 写入 cookies
        const response = NextResponse.json({
            user: {
                id: userId,
                username
            }
        })
        response.cookies.set('token', token, { httpOnly: true, secure: true })

        return response
    } catch (error) {
        console.error('Authentication error:', error)
        if ((error as DbError).code === 'ECONNREFUSED') {
            return NextResponse.json({ error: '数据库连接失败' }, { status: 500 })
        }
        return NextResponse.json({ error: '认证失败' }, { status: 500 })
    }
} 