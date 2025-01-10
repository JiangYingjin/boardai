import { NextResponse } from 'next/server'
import { db } from '../../../../../../lib/db'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { RowDataPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

interface ClassPhoto extends RowDataPacket {
    photo_id: number
    photo_url: string
    created_at: string
}

export async function GET(
    request: Request,
    { params }: { params: { courseId: string; classId: string } }
) {
    try {
        const { courseId, classId } = await params

        // 验证用户身份
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        // 验证课程访问权限
        const [courseRows] = await db.query<RowDataPacket[]>(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, decoded.userId]
        )

        if (!courseRows.length) {
            return NextResponse.json({ error: '无权访问该课程' }, { status: 403 })
        }

        // 获取课堂信息和照片
        const [classRows] = await db.query<RowDataPacket[]>(
            'SELECT class_id, class_date FROM classes WHERE class_id = ? AND course_id = ?',
            [classId, courseId]
        )

        if (!classRows.length) {
            return NextResponse.json({ error: '课堂不存在' }, { status: 404 })
        }

        const [photos] = await db.query<ClassPhoto[]>(
            'SELECT photo_id, photo_url, created_at FROM board_photos WHERE class_id = ? ORDER BY created_at',
            [classId]
        )

        return NextResponse.json({
            ...classRows[0],
            photos
        })
    } catch (error) {
        console.error('Error fetching class info:', error)
        return NextResponse.json({ error: '获取课堂信息失败' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { courseId: string; classId: string } }
) {
    try {
        const { courseId, classId } = await params

        // 验证用户身份
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        // 验证课程访问权限
        const [courseRows] = await db.query<RowDataPacket[]>(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, decoded.userId]
        )

        if (!courseRows.length) {
            return NextResponse.json({ error: '无权访问该课程' }, { status: 403 })
        }

        // 验证课堂存在性并属于该课程
        const [classRows] = await db.query<RowDataPacket[]>(
            'SELECT class_id FROM classes WHERE class_id = ? AND course_id = ?',
            [classId, courseId]
        )

        if (!classRows.length) {
            return NextResponse.json({ error: '课堂不存在' }, { status: 404 })
        }

        // 直接删除课堂，相关数据会自动级联删除
        // 包括：
        // - board_photos (通过 classes_ibfk_1 CASCADE)
        // - analysis (通过 board_photos_ibfk_1 CASCADE)
        // - summaries (通过 summaries_ibfk_1 CASCADE)
        await db.query(
            'DELETE FROM classes WHERE class_id = ?',
            [classId]
        )

        return NextResponse.json({ message: '课堂删除成功' })
    } catch (error) {
        console.error('Error deleting class:', error)
        return NextResponse.json({ error: '删除课堂失败' }, { status: 500 })
    }
} 