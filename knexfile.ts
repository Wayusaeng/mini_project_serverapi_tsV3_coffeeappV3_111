require('ts-node/register')
import dotenv from 'dotenv'
dotenv.config()

const connection = {
  host: '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
}

const migrations = {
  tableName: 'migrations',
  extension: 'ts',
  directory: './migrations',
}

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      ...connection,
      database: process.env.DB_DATABASE
    },
    migrations,
  },

  // feature.md C5 (ปิด G10): ฐานข้อมูลแยกสำหรับ test
  //
  // ต้องแยกจริง ไม่ใช่ใช้ตัวเดียวกับตอนพัฒนา เพราะ test ลบข้อมูลทิ้งทุกครั้งที่รัน
  // ถ้าชี้ผิดฐาน สินค้าและคำสั่งซื้อที่ทดลองไว้ตอนเรียนจะหายหมด
  test: {
    client: 'mysql2',
    connection: {
      ...connection,
      database: process.env.DB_DATABASE_TEST || 'coffee_app_test'
    },
    migrations,
  },
}
