import mysql, { PoolOptions } from "mysql2"

// feature.md ข้อ 6 "ข้อยกเว้นที่ควรทำแม้ไม่ใช่ Feature":
// เดิมไฟล์นี้ใช้ mysql.createConnection() ซึ่งเป็น connection เดี่ยว — MySQL จะตัดทิ้ง
// เมื่อ idle เกิน wait_timeout ทำให้ API ค้างกลางคาบเรียนโดยไม่มี error ที่อธิบายได้
// Pool แก้ปัญหานี้เพราะสร้าง connection ใหม่ให้อัตโนมัติเมื่อของเดิมหลุด
const poolConfig: PoolOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

const pool = mysql.createPool(poolConfig)

// Promise API สำหรับโค้ดใหม่ (Order API ใน feature.md A2)
//
// ทำไมต้องมีสองแบบ: controller เดิมทุกตัวเขียนด้วย callback (`connection.execute(sql, params, cb)`)
// การเปลี่ยนทั้งหมดพร้อมกันจะกลายเป็นงาน refactor ก้อนใหญ่ที่บดบัง Feature ที่กำลังสอน
// Pool ตัวเดียวกันจึงถูก export ออกไปสองหน้าตา ใช้ connection ร่วมกัน ไม่ได้เปิดสองชุด
//
// งานที่ต้องทำหลายคำสั่งให้สำเร็จหรือล้มเหลวพร้อมกัน (DB Transaction) ให้ขอ connection
// เฉพาะตัวด้วย db.getConnection() แล้ว beginTransaction/commit/rollback บน connection นั้น
// — ห้ามสั่ง BEGIN บน pool ตรง ๆ เพราะแต่ละ query อาจได้คนละ connection
export const db = pool.promise()

// feature.md C5: ปิด pool ให้หมดหลัง test จบ
//
// Jest จะเตือน "A worker process has failed to exit gracefully" ถ้ายังมี connection
// ค้างอยู่ — เรียกใน afterAll ของ test เท่านั้น ไม่ต้องเรียกตอนรันเซิร์ฟเวอร์จริง
export function closePool(): Promise<void> {
  return db.end()
}

// Callback API สำหรับ controller เดิม — signature เหมือน createConnection() ทุกอย่าง
// จึงไม่ต้องแก้ authController/productController ตอนเปลี่ยนมาใช้ pool
export default pool
