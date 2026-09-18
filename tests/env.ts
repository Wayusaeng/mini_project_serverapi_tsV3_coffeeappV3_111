import dotenv from 'dotenv'

// feature.md C5: บังคับให้ทุก test ชี้ไปฐานข้อมูลทดสอบเสมอ
//
// ไฟล์นี้ถูกเรียกโดย jest ก่อนโมดูลใด ๆ ถูก import — สำคัญมาก เพราะ utils/db.ts
// สร้าง connection pool ทันทีตอนถูก import โดยอ่านค่าจาก process.env ณ ตอนนั้น
//
// dotenv.config() ไม่เขียนทับค่าที่ตั้งไว้แล้ว การตั้ง DB_DATABASE หลังจากนี้จึงอยู่ตัว
dotenv.config()

process.env.DB_DATABASE = process.env.DB_DATABASE_TEST || 'coffee_app_test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_jest'
process.env.JWT_EXPIRES_IN = '1h'
