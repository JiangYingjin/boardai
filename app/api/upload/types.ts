export interface WorkerData {
    imageInfos: {
        photoId: number
        filePath: string
    }[]
    finalClassId: number
}

export interface WorkerResponse {
    success: boolean
    message?: string
} 