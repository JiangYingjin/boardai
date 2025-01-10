import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { RowDataPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

interface ClassRow extends RowDataPacket {
    class_id: number
    class_date: string
}

interface PhotoRow extends RowDataPacket {
    photo_id: number
    photo_url: string
    created_at: string
    explanation?: string
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const courseId = searchParams.get('courseId')
    const classId = searchParams.get('classId')

    try {
        switch (action) {
            case 'getClass':
                if (!courseId || !classId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                return await getClass(courseId, classId)

            case 'getCourse':
                if (!courseId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                return await getCourse(courseId)

            default:
                return await getCourseList()
        }
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: '操作失败' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const courseId = searchParams.get('courseId')
    const classId = searchParams.get('classId')

    try {
        switch (action) {
            case 'deleteClass':
                if (!courseId || !classId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                return await deleteClass(courseId, classId)

            case 'deleteCourse':
                if (!courseId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                return await deleteCourse(courseId)

            case 'updateCourse':
                if (!courseId) {
                    return NextResponse.json({ error: '参数错误' }, { status: 400 })
                }
                const { courseName } = await request.json()
                return await updateCourse(courseId, courseName)

            default:
                return NextResponse.json({ error: '未知操作' }, { status: 400 })
        }
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: '操作失败' }, { status: 500 })
    }
}

// 获取课程列表
async function getCourseList() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        const [rows] = await db.query(
            'SELECT course_id, course_name FROM courses WHERE user_id = ?',
            [decoded.userId]
        )

        return NextResponse.json(rows)
    } catch (error) {
        console.error('Error fetching courses:', error)
        return NextResponse.json({ error: '获取课程列表失败' }, { status: 500 })
    }
}

// 获取单个课程信息
async function getCourse(courseId: string) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        const [courseRows] = await db.query<RowDataPacket[]>(
            'SELECT c.*, COUNT(cl.class_id) as class_count FROM courses c ' +
            'LEFT JOIN classes cl ON c.course_id = cl.course_id ' +
            'WHERE c.course_id = ? AND c.user_id = ? ' +
            'GROUP BY c.course_id',
            [courseId, decoded.userId]
        )

        if (!courseRows.length) {
            return NextResponse.json({ error: '课程不存在或无权访问' }, { status: 404 })
        }

        const [classes] = await db.query<ClassRow[]>(
            'SELECT class_id, title, class_date, short_description, long_description ' +
            'FROM classes WHERE course_id = ? ORDER BY class_date DESC',
            [courseId]
        )

        return NextResponse.json({
            ...courseRows[0],
            classes
        })
    } catch (error) {
        console.error('Error fetching course:', error)
        return NextResponse.json({ error: '获取课程信息失败' }, { status: 500 })
    }
}

// 更新课程信息
async function updateCourse(courseId: string, courseName: string) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        await db.query(
            'UPDATE courses SET course_name = ? WHERE course_id = ? AND user_id = ?',
            [courseName, courseId, decoded.userId]
        )

        return NextResponse.json({ message: '更新成功' })
    } catch (error) {
        console.error('Error updating course:', error)
        return NextResponse.json({ error: '更新课程失败' }, { status: 500 })
    }
}

// 删除课程
async function deleteCourse(courseId: string) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const decoded = verify(token, JWT_SECRET) as { userId: number }

        await db.query(
            'DELETE FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, decoded.userId]
        )

        return NextResponse.json({ message: '删除成功' })
    } catch (error) {
        console.error('Error deleting course:', error)
        return NextResponse.json({ error: '删除课程失败' }, { status: 500 })
    }
}

// 获取课堂信息
async function getClass(courseId: string, classId: string) {
    try {
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
        const [classRows] = await db.query<ClassRow[]>(
            'SELECT class_id, class_date FROM classes WHERE class_id = ? AND course_id = ?',
            [classId, courseId]
        )

        if (!classRows.length) {
            return NextResponse.json({ error: '课堂不存在' }, { status: 404 })
        }

        const [photos] = await db.query<PhotoRow[]>(
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

// 删除课堂
async function deleteClass(courseId: string, classId: string) {
    try {
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

        // 验证课堂存在性
        const [classRows] = await db.query<RowDataPacket[]>(
            'SELECT class_id FROM classes WHERE class_id = ? AND course_id = ?',
            [classId, courseId]
        )

        if (!classRows.length) {
            return NextResponse.json({ error: '课堂不存在' }, { status: 404 })
        }

        await db.query('DELETE FROM classes WHERE class_id = ?', [classId])

        return NextResponse.json({ message: '课堂删除成功' })
    } catch (error) {
        console.error('Error deleting class:', error)
        return NextResponse.json({ error: '删除课堂失败' }, { status: 500 })
    }
}