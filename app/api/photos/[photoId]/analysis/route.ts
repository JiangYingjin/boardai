import { NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { RowDataPacket } from 'mysql2'

export async function GET(
    request: Request,
    { params }: { params: { photoId: string } }
) {


    try {
        const { photoId: photoIdParam } = await params

        console.log('开始处理GET请求，photoId:', photoIdParam)

        const cookieStore = await cookies()
        console.log('获取cookieStore成功')

        const JWT_SECRET = process.env.JWT_SECRET || 'jwt'
        const token = cookieStore.get('token')?.value
        if (!token) {
            console.warn('未找到token，用户未登录')
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }
        console.log('token已获取:', token)

        let decoded
        try {
            decoded = verify(token, JWT_SECRET) as { userId: number }
            console.log('token验证成功，decoded:', decoded)
        } catch (err) {
            console.error('token验证失败:', err)
            return NextResponse.json({ error: '无效的令牌' }, { status: 401 })
        }

        console.log('开始查询用户课程权限')
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT c.course_id
             FROM courses c
             JOIN classes cl ON c.course_id = cl.course_id
             JOIN board_photos bp ON cl.class_id = bp.class_id
             WHERE bp.photo_id = ? AND c.user_id = ?`,
            [photoIdParam, decoded.userId]
        )
        console.log('查询结果:', rows)

        if (!rows.length) {
            console.warn('用户无权访问该照片')
            return NextResponse.json({ error: '无权访问该照片' }, { status: 403 })
        }

        const photoId = parseInt(photoIdParam)
        if (isNaN(photoId)) {
            console.error('解析photoId失败，photoId无效:', photoIdParam)
            return NextResponse.json({ error: '无效的照片ID' }, { status: 400 })
        }
        console.log('photoId解析成功:', photoId)

        console.log('开始从数据库获取分析数据')
        const [analysisRows] = await db.execute<RowDataPacket[]>(
            `SELECT explanation 
             FROM analysis 
             WHERE photo_id = ?`,
            [photoId]
        )
        console.log('分析数据查询结果:', analysisRows)

        if (!analysisRows.length) {
            console.warn('未找到分析数据')
            return NextResponse.json({ explanation: null }, { status: 200 })
        }

        console.log('成功获取分析数据:', analysisRows[0].explanation)
        return NextResponse.json({
            explanation: analysisRows[0].explanation
        })

    } catch (error) {
        console.error('获取分析失败:', error)
        return NextResponse.json(
            { error: '获取分析数据失败' },
            { status: 500 }
        )
    }
} 