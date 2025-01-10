import { Worker } from 'worker_threads'
import type { WorkerData } from './types'

export type { WorkerData }

export async function createWorker(workerData: WorkerData): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            '/root/proj/boardai/dist/worker.impl.js',
            {
                workerData
            }
        )

        worker.on('message', (message) => {
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