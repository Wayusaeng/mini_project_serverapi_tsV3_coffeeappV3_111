import path from 'path'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import knexLib from 'knex'

// feature.md C5 (ปิด G10) — เตรียมฐานข้อมูลทดสอบก่อนรัน test ทั้งหมด
//
// ทำงานครั้งเดียวต่อการรัน jest หนึ่งครั้ง:
//   1. DROP แล้ว CREATE ฐานข้อมูลทดสอบใหม่ทั้งลูก (ได้สภาพเริ่มต้นที่แน่นอนเสมอ)
//   2. รัน migration ทั้ง 4 ไฟล์
//   3. รัน seed — สินค้า 14 รายการ และบัญชี admin@example.com
//
// การ DROP ทิ้งทุกครั้งคือเหตุผลว่าทำไมต้องใช้ฐานข้อมูล *แยก* จากตอนพัฒนา
export default async function globalSetup(): Promise<void> {
  dotenv.config()

  const database = process.env.DB_DATABASE_TEST || 'coffee_app_test'
  const connection = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }

  // เชื่อมต่อโดยยังไม่ระบุฐานข้อมูล เพื่อสร้างตัวฐานข้อมูลเอง
  const admin = await mysql.createConnection(connection)
  await admin.query(`DROP DATABASE IF EXISTS \`${database}\``)
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await admin.end()

  // migration และ seed เขียนด้วย TypeScript — knex require() ไฟล์พวกนี้ตอน runtime
  // ซึ่งไม่ผ่าน transform ของ jest จึงต้องลงทะเบียน ts-node ให้ require .ts ได้
  //
  // ใช้ transpile-only เพราะที่นี่ต้องการแค่ "แปลง TS เป็น JS ให้รันได้" การตรวจชนิด
  // ข้อมูลเป็นหน้าที่ของ `npx tsc --noEmit` ที่รันแยกอยู่แล้ว ถ้าเปิด type check ตรงนี้
  // ts-node จะใช้ options คนละชุดกับ tsc แล้วฟ้อง TS7006 ใส่ migration เดิมที่ปกติดี
  require('ts-node/register/transpile-only')

  const knex = knexLib({
    client: 'mysql2',
    connection: { ...connection, database },
    migrations: {
      tableName: 'migrations',
      extension: 'ts',
      directory: path.join(__dirname, '..', 'migrations'),
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.join(__dirname, '..', 'seeds'),
      loadExtensions: ['.ts'],
    },
  })

  try {
    await knex.migrate.latest()
    await knex.seed.run()
  } finally {
    await knex.destroy()
  }
}
