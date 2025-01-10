import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { Worker } from 'worker_threads';

const UPLOAD_DIR = '/www/share/proj/BoardAI'
const BASE_URL = 'https://s.jyj.cx/proj/BoardAI'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt'

interface CourseResult extends RowDataPacket {
    id: number
}

interface ImageInfo {
    photoId: number;
    fileUrl: string;
    filePath: string;
    creationTime: Date;
}

export async function POST(request: Request) {
    console.log('=== Upload API Start ===')
    console.log('Request headers:', request.headers)
    console.log('Request method:', request.method)
    console.log('Request URL:', request.url)

    try {
        console.log('开始解析表单数据...')
        const formData = await request.formData()
        console.log('表单数据原始内容:', formData)

        const images = formData.getAll('images') as File[]
        console.log('图片数量:', images.length)
        console.log('图片详细信息:', images.map(img => ({
            name: img.name,
            type: img.type,
            size: img.size,
            lastModified: img.lastModified
        })))

        const creationTimes = formData.getAll('creationTimes').map(Number)
        console.log('创建时间列表:', creationTimes)
        console.log('创建时间详细:', creationTimes.map(time => new Date(time).toISOString()))

        const courseId = formData.get('courseId')
        const newCourseName = formData.get('newCourseName')
        const classId = formData.get('classId')
        console.log('课程信息:', {
            courseId: courseId,
            newCourseName: newCourseName,
            hasNewCourse: !!newCourseName,
            hasCourseId: !!courseId,
            classId: classId
        })

        console.log('开始验证认证信息...')
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        console.log('Cookie token:', token)

        if (!token) {
            console.error('认证失败: 缺少或无效的认证头')
            return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
        }

        let userId: number
        try {
            console.log('开始解析JWT令牌...')
            const decoded = verify(token, JWT_SECRET) as { userId: number }
            userId = decoded.userId
            console.log('解析的用户信息:', {
                userId: decoded.userId
            })
        } catch (error) {
            console.error('令牌验证失败:', error)
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            })
            return NextResponse.json({ error: '令牌验证失败' }, { status: 401 })
        }

        try {
            console.log('开始数据库事务...')
            let finalCourseId: number

            if (newCourseName) {
                console.log('创建新课程:', newCourseName)
                console.log('执行SQL: INSERT INTO courses')

                const [result] = await db.query<ResultSetHeader>(
                    'INSERT INTO courses (course_name, user_id) VALUES (?, ?)',
                    [newCourseName, userId]
                )
                finalCourseId = result.insertId
                console.log('新课程创建结果:', {
                    insertId: result.insertId,
                    affectedRows: result.affectedRows,
                    warningStatus: result.warningStatus
                })
            } else {
                console.log('使用现有课程:', courseId)
                console.log('执行SQL: SELECT FROM courses')

                const [courseResult] = await db.query<CourseResult[]>(
                    'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
                    [courseId, userId]
                )
                console.log('课程查询结果:', courseResult)

                if (!courseResult || courseResult.length === 0) {
                    console.error('课程访问权限验证失败:', {
                        courseId: courseId,
                        userId: userId
                    })
                    return NextResponse.json({ error: '无权访问该课程' }, { status: 403 })
                }
                finalCourseId = Number(courseId)
            }

            let finalClassId: number
            if (classId) {
                finalClassId = Number(classId)
            } else {
                console.log('创建课堂记录...')
                console.log('执行SQL: INSERT INTO classes')
                const [classResult] = await db.query<ResultSetHeader>(
                    'INSERT INTO classes (course_id, class_date) VALUES (?, CURDATE())',
                    [finalCourseId]
                )
                finalClassId = classResult.insertId
                console.log('课堂创建结果:', {
                    classId: finalClassId,
                    affectedRows: classResult.affectedRows,
                    courseId: finalCourseId
                })
            }

            const imageInfos: ImageInfo[] = []
            console.log('开始处理图片文件...')
            for (let i = 0; i < images.length; i++) {
                const image = images[i]
                const creationTime = new Date(creationTimes[i])
                console.log(`处理第 ${i + 1}/${images.length} 张图片:`, {
                    name: image.name,
                    size: image.size,
                    type: image.type,
                    creationTime: creationTime.toISOString()
                })

                const uuid = uuidv4()
                const ext = path.extname(image.name)
                const fileName = `${uuid}${ext}`
                const filePath = path.join(UPLOAD_DIR, fileName)
                const fileUrl = `${BASE_URL}/${fileName}`

                console.log('文件信息:', {
                    uuid: uuid,
                    originalName: image.name,
                    fileName: fileName,
                    filePath: filePath,
                    fileUrl: fileUrl,
                    extension: ext
                })

                console.log('开始写入文件...')
                const bytes = await image.arrayBuffer()
                console.log('文件大小:', bytes.byteLength, 'bytes')
                await writeFile(filePath, Buffer.from(bytes))
                console.log('文件写入成功:', filePath)

                console.log('创建图片数据库记录...')
                console.log('执行SQL: INSERT INTO board_photos')
                const [photoResult] = await db.query<ResultSetHeader>(
                    'INSERT INTO board_photos (class_id, photo_url, created_at) VALUES (?, ?, ?)',
                    [finalClassId, fileUrl, creationTime]
                )
                console.log('图片记录创建结果:', photoResult)

                imageInfos.push({
                    photoId: photoResult.insertId,
                    fileUrl,
                    filePath,
                    creationTime
                });
            }

            console.log('=== Upload completed successfully ===')

            // 启动 worker 线程
            if (imageInfos.length > 0) {
                console.log('启动 worker 线程进行图片分析...')
                const worker = new Worker(path.join(process.cwd(), 'app', 'api', 'upload', 'worker.js'), {
                    workerData: {
                        imageInfos,
                        finalClassId
                    }
                })

                worker.on('message', (message) => {
                    console.log('worker 线程消息:', message);
                });

                worker.on('error', (error) => {
                    console.error('worker 线程错误:', error);
                });

                worker.on('exit', (code) => {
                    console.log(`worker 线程已退出，退出代码: ${code}`);
                });
            }

            return NextResponse.json({
                courseId: finalCourseId,
                classId: finalClassId
            })
        } catch (error) {
            console.error('事务错误:', error)
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            })
            console.log('回滚事务...')
            throw error
        }
    } catch (error) {
        console.error('上传失败:', {
            error: error,
            name: error.name,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            time: new Date().toISOString()
        })
        return NextResponse.json({ error: '上传失败' }, { status: 500 })
    } finally {
        console.log('=== Upload API End ===')
        console.log('完成时间:', new Date().toISOString())
    }
}