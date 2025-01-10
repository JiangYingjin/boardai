import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { RowDataPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const photoId = searchParams.get('photoId')

    try {
        switch (action) {
            case 'getAnalysis':
                if (!photoId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                return await getAnalysis(photoId)

            default:
                return NextResponse.json({ error: '未知操作' }, { status: 400 })
        }
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: '操作失败' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const photoId = searchParams.get('photoId')

    try {
        switch (action) {
            case 'deletePhoto':
                if (!photoId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                return await deletePhoto(photoId)

            default:
                return NextResponse.json({ error: '未知操作' }, { status: 400 })
        }
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: '操作失败' }, { status: 500 })
    }
}

async function getAnalysis(photoId: string) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT a.explanation FROM analysis a ' +
            'JOIN board_photos p ON a.photo_id = p.photo_id ' +
            'JOIN classes c ON p.class_id = c.class_id ' +
            'JOIN courses co ON c.course_id = co.course_id ' +
            'WHERE a.photo_id = ? AND co.user_id = ?',
            [photoId, decoded.userId]
        )

        if (!rows.length) {
            return NextResponse.json({ error: '分析不存在或无权访问' }, { status: 404 })
        }

        return NextResponse.json(rows[0])
    } catch (error) {
        console.error('Error fetching analysis:', error)
        return NextResponse.json({ error: '获取分析失败' }, { status: 500 })
    }
}

async function deletePhoto(photoId: string) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        // 验证照片所有权
        const [photos] = await db.query<RowDataPacket[]>(
            'SELECT p.photo_id FROM board_photos p ' +
            'JOIN classes c ON p.class_id = c.class_id ' +
            'JOIN courses co ON c.course_id = co.course_id ' +
            'WHERE p.photo_id = ? AND co.user_id = ?',
            [photoId, decoded.userId]
        )

        if (!photos.length) {
            return NextResponse.json({ error: '照片不存在或无权访问' }, { status: 404 })
        }

        await db.query('DELETE FROM board_photos WHERE photo_id = ?', [photoId])

        return NextResponse.json({ message: '删除成功' })
    } catch (error) {
        console.error('Error deleting photo:', error)
        return NextResponse.json({ error: '删除照片失败' }, { status: 500 })
    }
}
