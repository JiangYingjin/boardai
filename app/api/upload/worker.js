const { parentPort, workerData } = require('worker_threads');
const mysql = require('mysql2/promise');
const { readFile } = require('fs/promises');
const OpenAI = require('openai');

const db = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
});

const openai = new OpenAI({
    apiKey: process.env.ONEAPI_API_KEY,
    baseURL: 'https://oneapi.jyj.cx/v1',
});

async function analyzeImage(photoId, filePath) {
    try {
        console.log('开始分析图片:', filePath)
        // 读取文件并转换为 base64 编码
        const fileBuffer = await readFile(filePath);
        console.log('文件读取成功，文件大小:', fileBuffer.length);
        const base64Image = fileBuffer.toString('base64');
        console.log('文件转换为 base64 编码成功，base64 长度:', base64Image.length);

        // 调用 OpenAI API 进行图像分析
        console.log('调用 OpenAI API 进行图像分析')
        const responseStream = await openai.chat.completions.create({
            model: "gpt-4o-2024-11-20",
            // model: "gemini-2.0-flash-exp",
            // model: "doubao-vision-pro-32k-241028",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text", text: `
# 任务
- 详细分析该大学课程板书内容，阐述相关知识点。

# 要求
- 行内公式和块级公式必须用$和$$来包裹！！！
- 行内公式和块级公式禁止使用[]和()来包裹！！！` },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            stream: true,
        });

        let explanation = '';
        let lastInsertTime = Date.now();
        for await (const chunk of responseStream) {
            console.log('接收到的流数据块:', chunk);
            explanation += chunk.choices[0]?.delta?.content || '';
            const isComplete = chunk.choices[0]?.finish_reason === 'stop';
            const explanationToSave = isComplete ? explanation : explanation + ' ...';
            console.log('当前 explanation:', explanationToSave);

            const currentTime = Date.now();
            if (currentTime - lastInsertTime > 1000 || isComplete) {
                console.log('准备更新数据库，photoId:', photoId, 'explanationToSave:', explanationToSave);
                await db.query(
                    'INSERT INTO analysis (photo_id, explanation) VALUES (?, ?) ON DUPLICATE KEY UPDATE explanation = ?',
                    [photoId, explanationToSave, explanationToSave]
                );

                const fs = require('fs');
                const path = require('path');
                const cwd = process.cwd();
                const tmpDir = path.join(cwd, 'tmp');
                if (!fs.existsSync(tmpDir)) {
                    fs.mkdirSync(tmpDir, { recursive: true });
                }
                const filePath = path.join(tmpDir, `${photoId}.md`);
                fs.writeFileSync(filePath, explanationToSave, 'utf8');
                console.log(`文件保存成功: ${filePath}`);

                console.log('数据库更新成功');
                lastInsertTime = currentTime;
            }
        }

        parentPort?.postMessage({ success: true, message: `图片分析成功并保存, photoId: ${photoId}` });
    } catch (error) {
        console.error('Error analyzing image:', error);
        parentPort?.postMessage({ success: false, message: `图片分析失败: ${error.message}` });
    }
}

async function generateTitle(fullExplanation, finalClassId) {
    console.log('生成课堂标题');
    const response = await openai.chat.completions.create({
        model: "doubao-pro-256k-241115",
        // model: "gemini-2.0-flash-exp",
        max_tokens: 4000,
        messages: [
            {
                role: "user",
                content: `根据课堂内容生成课堂笔记标题。要求简洁明了，只输出一行字，不超过10个字。\n课堂内容：${fullExplanation}`
            }
        ]
    });

    const title = response.choices[0].message.content;
    console.log('生成的 title:', title);

    await db.query(
        'UPDATE classes SET title = ? WHERE class_id = ?',
        [title, finalClassId]
    );
    console.log('课堂标题更新成功，classId:', finalClassId, 'title:', title);
}

async function generateShortDescription(fullExplanation, finalClassId) {
    console.log('生成课堂简短描述');
    const response = await openai.chat.completions.create({
        model: "doubao-pro-256k-241115",
        // model: "gemini-2.0-flash-exp",
        max_tokens: 4000,
        messages: [
            {
                role: "user",
                content: `根据以下内容生成课堂的简短描述：\n${fullExplanation}`
            }
        ]
    });

    const shortDescription = response.choices[0].message.content;
    console.log('生成的 short_description:', shortDescription);

    await db.query(
        'UPDATE classes SET short_description = ? WHERE class_id = ?',
        [shortDescription, finalClassId]
    );
    console.log('课堂简短描述更新成功，classId:', finalClassId, 'shortDescription:', shortDescription);
}

async function generateLongDescription(fullExplanation, finalClassId) {
    console.log('生成课堂详细描述');
    const response = await openai.chat.completions.create({
        model: "doubao-pro-256k-241115",
        // model: "gemini-2.0-flash-exp",
        max_tokens: 4000,
        messages: [
            {
                role: "user",
                content: `根据以下内容生成课堂的详细描述：\n${fullExplanation}`
            }
        ]
    });

    const longDescription = response.choices[0].message.content;
    console.log('生成的 long_description:', longDescription);

    await db.query(
        'UPDATE classes SET long_description = ? WHERE class_id = ?',
        [longDescription, finalClassId]
    );
    console.log('课堂详细描述更新成功，classId:', finalClassId, 'longDescription:', longDescription);
}

(async () => {
    const { imageInfos, finalClassId } = workerData;
    console.log('workerData:', workerData);

    try {
        // 使用 Promise.all 实现多线程同步处理
        console.log('开始多线程同步处理图片分析');
        await Promise.all(imageInfos.map(imageInfo =>
            analyzeImage(imageInfo.photoId, imageInfo.filePath)
        ));

        // 等待所有的该课堂的大模型响应已经结束
        console.log('等待所有的该课堂的大模型响应已经结束');
        const [explanations] = await db.query(
            'SELECT explanation FROM analysis WHERE photo_id IN (?) ORDER BY created_at ASC',
            [imageInfos.map(info => info.photoId)]
        );
        console.log('查询到的 explanations:', explanations);

        // 拼接所有 explanation
        const fullExplanation = explanations.map(row => row.explanation).join('\n\n');
        console.log('拼接后的 explanation:', fullExplanation);
        try {
            // 并行生成 title, short_description, long_description
            console.log('开始并行生成 title, short_description, long_description');
            await Promise.all([
                generateTitle(fullExplanation, finalClassId),
                generateShortDescription(fullExplanation, finalClassId),
                generateLongDescription(fullExplanation, finalClassId)
            ]);

            parentPort?.postMessage({ success: true, message: `课堂信息生成并保存成功, classId: ${finalClassId}` });
        } catch (error) {
            console.error('生成课堂信息时出错:', error);
            parentPort?.postMessage({ status: 'error', message: `生成课堂信息失败: ${error.message}` });
        }
    } catch (error) {
        console.error('分析错误:', error);
        parentPort?.postMessage({ status: 'error', message: `图片分析失败: ${error.message}` });
    }
})();