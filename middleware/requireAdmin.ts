import { Response, NextFunction } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { RequestWithUser } from './authMiddleware'

// feature.md B1 (ปิด G4) — Authentication ไม่เท่ากับ Authorization
//
// authenticateToken ตอบคำถาม "token นี้ของจริงไหม" เท่านั้น
// requireAdmin ตอบคำถามถัดไปที่ต่างกันคนละเรื่อง — "คนนี้มีสิทธิ์ทำสิ่งนี้หรือเปล่า"
//
// ต้องวางต่อจาก authenticateToken เสมอ เพราะอาศัย req.user ที่ตัวนั้นเซ็ตไว้
//
// ⚠️ ตั้งใจใช้ res.status(403) จริง ต่างจาก authMiddleware.ts เดิมที่ตอบ HTTP 200
// พร้อมใส่เลข status ไว้ใน body (ดู feature.md G6) — ความไม่สม่ำเสมอนี้จะถูกเก็บกวาด
// ทั้งระบบใน B2/B3 ตอนนี้ยึดของที่ถูกต้องไว้ก่อน ไม่เพิ่มของผิดตามของเดิม
function requireAdmin(req: RequestWithUser, res: Response, next: NextFunction) {
  const user = req.user as JwtPayload | undefined

  if (!user || typeof user === 'string') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
    })
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin role required',
    })
  }

  next()
}

export default requireAdmin