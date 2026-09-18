// Coffee App — สคริปต์ตรวจเกณฑ์ผ่านของ feature.md รอบ A1 / A2 / A3 / B1 / B2 / B3
//
// ตรวจสิ่งที่ "รันแล้วเท่านั้นถึงจะรู้" — เรื่องที่ flutter test กับ tsc มองไม่เห็น เช่น
// สิทธิ์ของ admin กับ customer, DB Transaction ที่ต้อง rollback จริง และการกันไม่ให้
// ผู้ใช้คนหนึ่งเห็นข้อมูลของอีกคน
//
// วิธีใช้ (ต้องเปิด MySQL และ npm start ไว้ก่อน):
//   node scripts/acceptance.mjs
//
// ไม่ต้องติดตั้ง package เพิ่ม ใช้ fetch ที่มากับ Node 18 ขึ้นไป

const BASE = process.env.API_BASE || 'http://localhost:3000'
const ADMIN = { email: 'admin@example.com', password: '123456' }

let passed = 0
const failures = []

function check(label, ok, detail = '') {
  if (ok) {
    passed++
    console.log(`  ok   ${label}`)
  } else {
    failures.push({ label, detail })
    console.log(`  FAIL ${label}${detail ? `  -> ${detail}` : ''}`)
  }
}

async function call(method, path, { token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data }
}

async function login(email, password) {
  const { status, data } = await call('POST', '/api/auth/login', {
    body: { email, password },
  })
  return status === 200 ? data : null
}

function decodePayload(token) {
  const part = token.split('.')[1]
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
}

function section(title) {
  console.log(`\n${title}`)
}

async function main() {
  // ตรวจว่าเซิร์ฟเวอร์เปิดอยู่ก่อน ไม่งั้น error ที่ได้จะชวนให้เข้าใจผิดว่าโค้ดพัง
  try {
    await call('GET', '/api/products')
  } catch {
    console.error(`\nเชื่อมต่อ ${BASE} ไม่ได้ — เปิด MySQL แล้วสั่ง npm start ก่อน\n`)
    process.exit(1)
  }

  const stamp = Date.now()

  section('B3 — HTTP Status Code จริง')
  {
    const { status } = await call('GET', '/api/products')
    check('GET /api/products ไม่มี token -> 401', status === 401, status)
  }
  {
    const { status } = await call('POST', '/api/auth/login', {
      body: { email: ADMIN.email, password: 'wrong-password' },
    })
    check('login รหัสผิด -> 401', status === 401, status)
  }
  {
    const { status } = await call('GET', '/api/products', { token: 'not.a.real.token' })
    check('token ปลอม -> 403 (ไม่ใช่ 401)', status === 403, status)
  }

  section('A1 — Register')
  const email = `student${stamp}@example.com`
  const reg = await call('POST', '/api/auth/register', {
    body: { firstname: 'New', lastname: 'Student', email, password: '123456' },
  })
  check('สมัครสมาชิกใหม่ -> 201', reg.status === 201, reg.status)
  check('สมัครแล้วได้ token กลับมาทันที', Boolean(reg.data?.token))
  check('ผู้สมัครใหม่ได้ role customer', reg.data?.user?.role === 'customer', reg.data?.user?.role)

  const customer = reg.data.token
  {
    const { status } = await call('POST', '/api/auth/register', {
      body: { firstname: 'New', lastname: 'Student', email, password: '123456' },
    })
    check('สมัครด้วย email ซ้ำ -> 409', status === 409, status)
  }

  section('B1 / B2 — JWT payload และอายุ Token')
  const payload = decodePayload(customer)
  check('payload มี id / email / role ครบ',
    ['id', 'email', 'role'].every((k) => k in payload), Object.keys(payload).join(','))
  check('payload มีวันหมดอายุ (exp)', 'exp' in payload,
    'exp' in payload ? `อายุ ${payload.exp - payload.iat} วินาที` : '')

  const adminSession = await login(ADMIN.email, ADMIN.password)
  check('admin login ได้และ role เป็น admin', adminSession?.user?.role === 'admin',
    adminSession?.user?.role)
  const admin = adminSession.token

  section('B3 — รูปร่าง Response ที่ normalize แล้ว')
  const list = await call('GET', '/api/products', { token: customer })
  check('GET /api/products -> 200', list.status === 200, list.status)
  check('รายการสินค้าเป็น Array', Array.isArray(list.data), typeof list.data)

  const productId = list.data[0].id
  const one = await call('GET', `/api/products/${productId}`, { token: customer })
  check('GET /api/products/:id -> 200', one.status === 200, one.status)
  check('GET /api/products/:id คืน Object ไม่ใช่ Array (G7)',
    !Array.isArray(one.data) && typeof one.data === 'object', Array.isArray(one.data) ? 'Array' : 'Object')
  {
    const { status } = await call('GET', '/api/products/999999', { token: customer })
    check('GET /api/products/:id ไม่พบ -> 404', status === 404, status)
  }

  section('B1 — Authorization (ซ่อนปุ่มใน UI ไม่ใช่ security)')
  {
    const { status } = await call('DELETE', `/api/products/${productId}`, { token: customer })
    check('customer ลบสินค้า -> 403', status === 403, status)
  }
  {
    const { status } = await call('DELETE', '/api/products/999999', { token: admin })
    check('admin ลบของที่ไม่มีอยู่ -> 404 (ไม่ใช่ 200)', status === 404, status)
  }

  section('A2 — Order API')
  const target = list.data.find((p) => p.stock >= 3)
  const stockBefore = target.stock

  const created = await call('POST', '/api/orders', {
    token: customer,
    body: { items: [{ product_id: target.id, quantity: 2 }] },
  })
  check('สั่งซื้อสำเร็จ -> 200', created.status === 200, created.status)

  const order = created.data?.order
  check('ราคาคิดจาก DB ไม่ใช่จากที่ client ส่ง',
    order?.total_price === target.price * 2, `${order?.total_price} ควรเป็น ${target.price * 2}`)
  check('order_items เก็บ Snapshot ชื่อสินค้า',
    order?.items?.[0]?.product_name === target.name)

  {
    const after = await call('GET', `/api/products/${target.id}`, { token: customer })
    check('stock ลดลงตามจำนวนที่สั่ง', after.data.stock === stockBefore - 2,
      `${stockBefore} -> ${after.data.stock}`)
  }

  const historyBefore = await call('GET', '/api/orders', { token: customer })
  check('GET /api/orders เห็นคำสั่งซื้อของตัวเอง',
    historyBefore.data.orders.some((o) => o.id === order.id))

  section('A2 — Transaction ต้อง rollback ทั้งชุด')
  const stockNow = (await call('GET', `/api/products/${target.id}`, { token: customer })).data.stock
  {
    const { status } = await call('POST', '/api/orders', {
      token: customer,
      body: { items: [{ product_id: target.id, quantity: 999999 }] },
    })
    check('สั่งเกิน stock -> 400', status === 400, status)
  }
  {
    const after = await call('GET', '/api/orders', { token: customer })
    check('คำสั่งซื้อที่ล้มเหลวไม่สร้างแถวใหม่',
      after.data.orders.length === historyBefore.data.orders.length,
      `${historyBefore.data.orders.length} -> ${after.data.orders.length}`)
  }
  {
    const after = await call('GET', `/api/products/${target.id}`, { token: customer })
    check('คำสั่งซื้อที่ล้มเหลวไม่แตะ stock', after.data.stock === stockNow,
      `${stockNow} -> ${after.data.stock}`)
  }

  section('A2 — Validation และความเป็นเจ้าของ')
  for (const [label, items] of [
    ['items ว่าง', []],
    ['quantity เป็น 0', [{ product_id: target.id, quantity: 0 }]],
    ['quantity ติดลบ', [{ product_id: target.id, quantity: -5 }]],
    ['product_id ไม่มีอยู่จริง', [{ product_id: 999999, quantity: 1 }]],
  ]) {
    const { status } = await call('POST', '/api/orders', { token: customer, body: { items } })
    check(`${label} -> 400`, status === 400, status)
  }

  const other = (await call('POST', '/api/auth/register', {
    body: { firstname: 'Other', lastname: 'User', email: `other${stamp}@example.com`, password: '123456' },
  })).data.token

  {
    const { status } = await call('GET', `/api/orders/${order.id}`, { token: other })
    check('user อื่นเปิด order ของเรา -> 403', status === 403, status)
  }
  {
    const { status, data } = await call('GET', `/api/orders/${order.id}`, { token: customer })
    check('เจ้าของเปิดเองได้ -> 200 พร้อมรายการสินค้า',
      status === 200 && data.order.items.length === 1, status)
  }
  {
    const { data } = await call('GET', '/api/orders', { token: other })
    check('user ใหม่เห็นประวัติว่าง', data.orders.length === 0, data.orders.length)
  }
  {
    const { status } = await call('GET', '/api/orders/999999', { token: customer })
    check('GET /api/orders/:id ไม่พบ -> 404', status === 404, status)
  }

  console.log(`\n${passed}/${passed + failures.length} เกณฑ์ผ่าน`)
  if (failures.length) {
    console.log('\nที่ไม่ผ่าน:')
    for (const f of failures) console.log(`  - ${f.label}${f.detail ? ` (${f.detail})` : ''}`)
    process.exit(1)
  }
  console.log('\nผ่านครบทุกข้อ')
}

main().catch((err) => {
  console.error('\nสคริปต์หยุดกลางคัน:', err.message)
  console.error('ตรวจว่า MySQL เปิดอยู่ รัน migration/seed แล้ว และ npm start ทำงานอยู่')
  process.exit(1)
})
