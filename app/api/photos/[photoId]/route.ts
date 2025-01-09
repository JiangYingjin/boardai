import { NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { RowDataPacket } from 'mysql2'

export async function DELETE(
    request: Request,
    { params }: { params: { photoId: string } }
) {
    try {
        const { photoId } = await params
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, process.env.JWT_SECRET || 'jwt') as { userId: number }

        // 验证用户是否有权限删除该照片
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT bp.photo_id FROM board_photos bp JOIN classes cl ON bp.class_id = cl.class_id JOIN courses c ON cl.course_id = c.course_id WHERE bp.photo_id = ? AND c.user_id = ?',
            [photoId, decoded.userId]
        )

        if (!rows.length) {
            return NextResponse.json({ error: '无权删除该照片' }, { status: 403 })
        }

        // 删除照片
        await db.query('DELETE FROM board_photos WHERE photo_id = ?', [photoId])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('删除照片失败:', error)
        return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }
} 