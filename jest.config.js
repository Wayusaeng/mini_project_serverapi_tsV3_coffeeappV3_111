// feature.md C5 (ปิด G10) — ทดสอบ API ด้วย Jest + supertest บนฐานข้อมูลแยก
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],

  // ตั้งค่า env ให้ชี้ฐานข้อมูลทดสอบ ต้องทำก่อนไฟล์ใดถูก import
  // เพราะ utils/db.ts สร้าง pool ทันทีตอน import โดยอ่านจาก process.env
  setupFiles: ['<rootDir>/tests/env.ts'],

  // ปิด pool หลัง test ในแต่ละไฟล์จบ ไม่งั้น Jest จะค้างรอ connection
  setupFilesAfterEnv: ['<rootDir>/tests/teardown.ts'],

  // สร้างฐานข้อมูลทดสอบใหม่ + รัน migration/seed ครั้งเดียวก่อน test ทั้งหมด
  globalSetup: '<rootDir>/tests/globalSetup.ts',

  // ทุกไฟล์ใช้ฐานข้อมูลเดียวกัน ถ้ารันขนานกันจะแย่ง stock กันจน test วูบวาบ
  maxWorkers: 1,

  testTimeout: 20000,
}
