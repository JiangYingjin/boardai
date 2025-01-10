"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const promise_1 = __importDefault(require("mysql2/promise"));
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const openai_1 = __importDefault(require("openai"));
const path_1 = __importDefault(require("path"));
const data = worker_threads_1.workerData;
const db = promise_1.default.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_DATABASE || 'proj_boardai',
    waitForConnections: true,
    connectionLimit: 10,
});
const openai = new openai_1.default({
    apiKey: process.env.ONEAPI_API_KEY,
    baseURL: 'https://oneapi.jyj.cx/v1',
});
async function analyzeImage(photoId, filePath) {
    try {
        console.log('开始分析图片:', filePath);
        const fileBuffer = await (0, promises_1.readFile)(filePath);
        const base64Image = fileBuffer.toString('base64');
        const responseStream = await openai.chat.completions.create({
            model: "gpt-4o-2024-11-20",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `
# 任务
- 详细分析该大学课程板书内容，阐述相关知识点。

# 要求
- 行内公式和块级公式必须用$和$$来包裹！！！
- 行内公式和块级公式禁止使用[]和()来包裹！！！`
                        },
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
            explanation += chunk.choices[0]?.delta?.content || '';
            const isComplete = chunk.choices[0]?.finish_reason === 'stop';
            const explanationToSave = isComplete ? explanation : explanation + ' ...';
            const currentTime = Date.now();
            if (currentTime - lastInsertTime > 1000 || isComplete) {
                await db.query('INSERT INTO analysis (photo_id, explanation) VALUES (?, ?) ON DUPLICATE KEY UPDATE explanation = ?', [photoId, explanationToSave, explanationToSave]);
                const cwd = process.cwd();
                const tmpDir = path_1.default.join(cwd, 'tmp');
                try {
                    if (!(0, fs_1.existsSync)(tmpDir)) {
                        await (0, promises_1.mkdir)(tmpDir, { recursive: true });
                    }
                    const outputPath = path_1.default.join(tmpDir, `${photoId}.md`);
                    await (0, promises_1.writeFile)(outputPath, explanationToSave, 'utf8');
                    console.log(`文件保存成功: ${outputPath}`);
                }
                catch (error) {
                    console.error('保存文件失败:', error);
                }
                lastInsertTime = currentTime;
            }
        }
        return explanation;
    }
    catch (error) {
        console.error('Error analyzing image:', error);
        throw error;
    }
}
async function generateTitle(fullExplanation, finalClassId) {
    console.log('生成课堂标题');
    try {
        const responseStream = await openai.chat.completions.create({
            model: "doubao-pro-256k-241115",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: `根据课堂内容生成课堂笔记标题。要求简洁明了，只输出一行字，不超过10个字。\n课堂内容：${fullExplanation}`
                }
            ],
            stream: true,
        });
        let title = '';
        let lastInsertTime = Date.now();
        for await (const chunk of responseStream) {
            title += chunk.choices[0]?.delta?.content || '';
            const isComplete = chunk.choices[0]?.finish_reason === 'stop';
            const titleToSave = isComplete ? title : title + ' ...';
            const currentTime = Date.now();
            if (currentTime - lastInsertTime > 1000 || isComplete) {
                await db.query('UPDATE classes SET title = ? WHERE class_id = ?', [titleToSave, finalClassId]);
                lastInsertTime = currentTime;
            }
        }
        return title;
    }
    catch (error) {
        console.error('生成标题失败:', error);
        throw error;
    }
}
async function generateShortDescription(fullExplanation, finalClassId) {
    console.log('生成课堂简短描述');
    try {
        const responseStream = await openai.chat.completions.create({
            model: "gpt-4o-2024-11-20",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: `
# 任务
根据板书内容简要概括该课堂的知识点

# 要求
- 避免输出标题

# 板书内容
${fullExplanation}`
                }
            ],
            stream: true,
        });
        let shortDescription = '';
        let lastInsertTime = Date.now();
        for await (const chunk of responseStream) {
            shortDescription += chunk.choices[0]?.delta?.content || '';
            const isComplete = chunk.choices[0]?.finish_reason === 'stop';
            const descriptionToSave = isComplete ? shortDescription : shortDescription + ' ...';
            const currentTime = Date.now();
            if (currentTime - lastInsertTime > 1000 || isComplete) {
                await db.query('UPDATE classes SET short_description = ? WHERE class_id = ?', [descriptionToSave, finalClassId]);
                lastInsertTime = currentTime;
            }
        }
        return shortDescription;
    }
    catch (error) {
        console.error('生成简短描述失败:', error);
        throw error;
    }
}
async function generateLongDescription(fullExplanation, finalClassId) {
    console.log('生成课堂详细描述');
    try {
        const responseStream = await openai.chat.completions.create({
            model: "gpt-4o-2024-11-20",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: `
# 任务
根据板书内容梳理该课堂的详细知识点

# 要求
- 避免输出标题

# 板书内容
${fullExplanation}`
                }
            ],
            stream: true,
        });
        let longDescription = '';
        let lastInsertTime = Date.now();
        for await (const chunk of responseStream) {
            console.log('接收到的流数据块:', chunk);
            longDescription += chunk.choices[0]?.delta?.content || '';
            const isComplete = chunk.choices[0]?.finish_reason === 'stop';
            const descriptionToSave = isComplete ? longDescription : longDescription + ' ...';
            console.log('当前 long_description:', descriptionToSave);
            const currentTime = Date.now();
            if (currentTime - lastInsertTime > 1000 || isComplete) {
                console.log('准备更新数据库，classId:', finalClassId, 'longDescription:', descriptionToSave);
                await db.query('UPDATE classes SET long_description = ? WHERE class_id = ?', [descriptionToSave, finalClassId]);
                const cwd = process.cwd();
                const tmpDir = path_1.default.join(cwd, 'tmp');
                if (!(0, fs_1.existsSync)(tmpDir)) {
                    await (0, promises_1.mkdir)(tmpDir, { recursive: true });
                }
                const filePath = path_1.default.join(tmpDir, `class_${finalClassId}_long_desc.md`);
                await (0, promises_1.writeFile)(filePath, descriptionToSave, 'utf8');
                console.log(`长描述文件保存成功: ${filePath}`);
                console.log('长描述数据库更新成功');
                lastInsertTime = currentTime;
            }
        }
        return longDescription;
    }
    catch (error) {
        console.error('生成长描述失败:', error);
        throw error;
    }
}
async function main() {
    try {
        await Promise.all(data.imageInfos.map(info => analyzeImage(info.photoId, info.filePath)));
        const [explanations] = await db.query('SELECT explanation FROM analysis WHERE photo_id IN (?) ORDER BY created_at ASC', [data.imageInfos.map(info => info.photoId)]);
        const fullExplanation = explanations.map(row => row.explanation).join('\n\n');
        await Promise.all([
            generateTitle(fullExplanation, data.finalClassId),
            generateShortDescription(fullExplanation, data.finalClassId),
            generateLongDescription(fullExplanation, data.finalClassId)
        ]);
        worker_threads_1.parentPort?.postMessage({ success: true });
    }
    catch (error) {
        worker_threads_1.parentPort?.postMessage({
            success: false,
            message: error instanceof Error ? error.message : '未知错误'
        });
    }
}
main().catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
});
