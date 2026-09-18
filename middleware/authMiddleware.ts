import jwt, { JwtPayload } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

// Extend the Express Request type with the user property
//
// export ออกไปด้วยเพราะ middleware/controller ตัวอื่นต้องอ่าน req.user ต่อ
// (requireAdmin ตรวจ role, productController ใช้ id เป็นเจ้าของสินค้า)
export interface RequestWithUser extends Request {
  user?: JwtPayload | string
}

function authenticateToken(req: RequestWithUser, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  // feature.md B3 (ปิด G6): ตอบ HTTP status code จริง
  //
  // เดิมบรรทัดพวกนี้ตอบ res.json({ status: 401 }) ซึ่งเป็น HTTP 200 ที่มีเลข 401
  // อยู่ในเนื้อ body — client ทุกตัวจึงต้องเขียนโค้ดพิเศษมาอ่าน field ในนั้นแทนที่จะ
  // ใช้ response.statusCode ตามปกติ
  if (token == null) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
    })
  }

  jwt.verify(token, process.env.JWT_SECRET || '', (err, user) => {
    if (err) {
      // feature.md B2: token หมดอายุคือ "ตัวตนหมดอายุ" ไม่ใช่ "ไม่มีสิทธิ์"
      // จึงต้องเป็น 401 เพื่อให้ client รู้ว่าต้องพากลับไป Login ใหม่
      // ส่วน token ที่ลายเซ็นผิด (ปลอมมา) ยังคงเป็น 403 ตามเดิม
      const expired = err.name === 'TokenExpiredError'

      return res.status(expired ? 401 : 403).json({
        status: 'error',
        message: expired ? 'Token expired' : 'Forbidden',
      })
    }
    req.user = user
    next()
  })
}

export default authenticateToken

