import mysql from 'mysql2/promise'

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || 'frji270801',
    database: process.env.MYSQL_DATABASE || 'proj_boardai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export async function testConnection() {
    try {
        const connection = await pool.getConnection()
        console.log('Database connection successful')
        connection.release()
        return true
    } catch (error) {
        console.error('Database connection failed:', error)
        return false
    }
}

export default pool 