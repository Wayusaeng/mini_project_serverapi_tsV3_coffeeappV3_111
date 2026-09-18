import express, { Express } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'

// feature.md C5 (ปิด G10) — แยก "ประกอบแอป" ออกจาก "เปิดพอร์ตฟัง"
//
// เดิมทั้งสองอย่างอยู่ใน server.ts ไฟล์เดียว ทำให้เขียน test ไม่ได้เลย เพราะแค่
// import เข้ามาก็จะไปยึดพอร์ต 3000 ทันที และถ้าเซิร์ฟเวอร์จริงเปิดอยู่ก็จะชนกัน
//
// ตอนนี้ไฟล์นี้ export app ที่ยังไม่ listen — supertest รับ app ไปสร้าง server
// ชั่วคราวบนพอร์ตสุ่มให้เองระหว่าง test ส่วน server.ts มีหน้าที่เดียวคือ listen

// Initialize dotenv
//
// dotenv จะไม่เขียนทับค่าที่มีอยู่แล้วใน process.env — test จึงตั้ง DB_DATABASE
// ให้ชี้ฐานข้อมูลสำหรับทดสอบก่อน import ไฟล์นี้ได้ โดยไม่ถูก .env ทับ
dotenv.config()

// Initialize App
const app: Express = express()

// Parse incoming JSON requests
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// Use Cors
app.use(cors())

// Use Static Files
app.use('/uploads', express.static('uploads'))
app.use('/uploads/images', express.static('uploads/images'))

// Routes
import authRoutes from './routes/authRoutes'
import productRoutes from './routes/productRoutes'
import orderRoutes from './routes/orderRoutes'

// Use Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)

export default app
