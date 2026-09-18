import bcrypt from 'bcrypt'

// Feature B1 (feature.md ข้อ 3.2) — บัญชี admin สำหรับสาธิตการแยกสิทธิ์
//
// ตั้งใจไม่ใช้ knex('users').del() เหมือน seeds/products.ts เพราะ user ที่นักศึกษา
// สมัครเองระหว่างเรียน (รวม Demo User student@example.com) ต้องไม่หายเมื่อรัน seed ซ้ำ
// seed นี้จึงเป็นแบบ upsert: มีอยู่แล้วก็อัปเดต role ให้ถูก ไม่มีก็สร้างใหม่
//
// คู่บัญชีที่ได้หลังรัน seed — ใช้พิสูจน์ว่า "ซ่อนปุ่มใน UI ไม่ใช่ security":
//   student@example.com / 123456  → role customer  → DELETE /api/products/:id ต้องได้ 403
//   admin@example.com   / 123456  → role admin     → DELETE /api/products/:id ต้องได้ 200
const ADMIN = {
  firstname: 'Coffee',
  lastname: 'Admin',
  email: 'admin@example.com',
  password: '123456',
}

exports.seed = async function (knex: any) {
  const hash = await bcrypt.hash(ADMIN.password, 10)

  const existing = await knex('users').where({ email: ADMIN.email }).first()

  if (existing) {
    await knex('users')
      .where({ id: existing.id })
      .update({ role: 'admin', updated_at: new Date() })
    return
  }

  await knex('users').insert({
    firstname: ADMIN.firstname,
    lastname: ADMIN.lastname,
    email: ADMIN.email,
    password: hash,
    role: 'admin',
    created_at: new Date(),
    updated_at: new Date(),
  })
}
