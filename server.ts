import app from './app'

// feature.md C5: ไฟล์นี้เหลือหน้าที่เดียวคือเปิดพอร์ตฟัง
// ตัวแอปทั้งหมด (middleware + routes) ย้ายไปอยู่ใน app.ts เพื่อให้ test import ได้
// โดยไม่ต้องยึดพอร์ต

// Listen Port
const port: string | number = process.env.PORT || 3000
const env: string = process.env.ENV || 'development'

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
  console.log(`App listening on env ${env}`)
  console.log(`Press Ctrl+C to quit.`)
})
