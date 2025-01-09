export interface User {
    user_id: number
    username: string
    password: string
    created_at: Date
    updated_at: Date
}

export interface Course {
    course_id: number
    user_id: number
    course_name: string
    created_at: Date
    updated_at: Date
}

export interface Class {
    class_id: number
    course_id: number
    class_date: Date
    created_at: Date
    updated_at: Date
}

export interface BoardPhoto {
    photo_id: number
    class_id: number
    photo_url: string
    created_at: Date
    updated_at: Date
} 