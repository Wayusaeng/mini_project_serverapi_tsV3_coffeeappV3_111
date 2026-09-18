import { closePool } from '../utils/db'

// ปิด connection pool หลัง test ในไฟล์นี้จบ
// ไม่มีบรรทัดนี้ Jest จะเตือน "A worker process has failed to exit gracefully"
// แล้วค้างรอจนหมดเวลา
afterAll(async () => {
  await closePool()
})
