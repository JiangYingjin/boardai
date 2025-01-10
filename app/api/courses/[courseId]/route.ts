import { NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { RowDataPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

interface CourseRow extends RowDataPacket {
    course_id: number
    course_name: string
}

interface ClassRow extends RowDataPacket {
    class_id: number
    title: string
    class_date: string
    short_description: string
    long_description: string
}

export async function GET(
    request: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const { courseId } = await params

        // 验证用户身份
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        // 获取课程信息并验证权限
        const [courseRows] = await db.query<CourseRow[]>(
            'SELECT course_id, course_name FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, decoded.userId]
        )

        if (!courseRows.length) {
            return NextResponse.json({ error: '无权访问该课程' }, { status: 403 })
        }

        // 获取课堂信息
        const [classRows] = await db.query<ClassRow[]>(
            `SELECT class_id, title, class_date, short_description, long_description 
             FROM classes 
             WHERE course_id = ? 
             ORDER BY class_date DESC`,
            [courseId]
        )

        return NextResponse.json({
            course_id: courseRows[0].course_id,
            course_name: courseRows[0].course_name,
            classes: classRows
        })

    } catch (error) {
        console.error('Error fetching course info:', error)
        return NextResponse.json({ error: '获取课程信息失败' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const { courseId } = await params

        // 验证用户身份
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        // 验证课程所有权
        const [courseRows] = await db.query<RowDataPacket[]>(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, decoded.userId]
        )

        if (!courseRows.length) {
            return NextResponse.json({ error: '无权删除该课程' }, { status: 403 })
        }

        // 删除课程（课堂会通过外键级联删除）
        await db.query(
            'DELETE FROM courses WHERE course_id = ?',
            [courseId]
        )

        return new NextResponse(null, { status: 204 })

    } catch (error) {
        console.error('Error deleting course:', error)
        return NextResponse.json({ error: '删除课程失败' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        const { courseId } = await params

        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        const { courseName } = await request.json()

        // 验证用户是否有权限修改该课程
        const [courses] = await db.query<RowDataPacket[]>(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, decoded.userId]
        )

        if (!courses.length) {
            return NextResponse.json({ error: '无权修改此课程' }, { status: 403 })
        }

        // 更新课程名称
        await db.query(
            'UPDATE courses SET course_name = ? WHERE course_id = ?',
            [courseName, courseId]
        )

        return NextResponse.json({ message: '更新成功' })
    } catch (error) {
        console.error('更新课程失败:', error)
        return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }
} 