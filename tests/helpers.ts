import request from 'supertest'
import app from '../app'

// ตัวช่วยที่ test ทุกไฟล์ใช้ร่วมกัน — supertest สร้าง server ชั่วคราวบนพอร์ตสุ่มให้เอง
// จาก app ที่ยังไม่ listen จึงไม่ชนกับเซิร์ฟเวอร์จริงที่อาจเปิดอยู่ที่พอร์ต 3000

export const ADMIN = { email: 'admin@example.com', password: '123456' }

export const api = () => request(app)

/** สมัคร customer ใหม่ด้วย email ที่ไม่ซ้ำ แล้วคืน token กับ id */
export async function registerCustomer(): Promise<{ token: string; id: number; email: string }> {
  const email = `customer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`

  const res = await api()
    .post('/api/auth/register')
    .send({ firstname: 'Test', lastname: 'Customer', email, password: '123456' })

  if (res.status !== 201) {
    throw new Error(`register ล้มเหลว: ${res.status} ${res.text}`)
  }

  return { token: res.body.token, id: res.body.user.id, email }
}

export async function loginAdmin(): Promise<string> {
  const res = await api().post('/api/auth/login').send(ADMIN)

  if (res.status !== 200) {
    throw new Error(
      `admin login ล้มเหลว: ${res.status} — seeds/users.ts รันแล้วหรือยัง?`
    )
  }

  return res.body.token
}

/** อ่าน payload ของ JWT โดยไม่ตรวจลายเซ็น (ใช้ตรวจโครงสร้างใน test เท่านั้น) */
export function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

export async function firstProduct(token: string): Promise<Record<string, number & string>> {
  const res = await api().get('/api/products').set('Authorization', `Bearer ${token}`)
  return res.body[0]
}
