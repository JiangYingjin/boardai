import { Worker } from 'worker_threads'
import path from 'path'
import type { WorkerData, WorkerResponse } from '@/app/api/upload/types'

export { WorkerData }

export function createWorker(workerData: WorkerData): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            path.join(process.cwd(), 'app', 'api', 'upload', 'worker.impl.ts'),
            {
                workerData
            }
        )

        worker.on('message', (message: WorkerResponse) => {
            if (message.success) {
                resolve()
            } else {
                reject(new Error(message.message))
            }
        })

        worker.on('error', reject)
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`))
            }
        })
    })
} 