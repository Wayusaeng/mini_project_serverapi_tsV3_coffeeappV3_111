import { api, registerCustomer, firstProduct } from './helpers'

// feature.md A2 — Order API
//
// test ชุดนี้พิสูจน์สามอย่างที่ต้องมีฐานข้อมูลจริงถึงจะตรวจได้:
// ราคาต้องมาจาก DB, Transaction ต้อง rollback ทั้งชุด และเจ้าของเท่านั้นที่ดูได้

async function pickProduct(token: string) {
  const res = await api().get('/api/products').set('Authorization', `Bearer ${token}`)
  return res.body.find((p: { stock: number }) => p.stock >= 5)
}

describe('POST /api/orders', () => {
  it('สั่งซื้อสำเร็จ คิดราคาจาก DB และตัด stock จริง', async () => {
    const { token, id: userId } = await registerCustomer()
    const product = await pickProduct(token)
    const stockBefore = product.stock

    const res = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ product_id: product.id, quantity: 2 }] })

    expect(res.status).toBe(200)

    const order = res.body.order
    expect(order.user_id).toBe(userId)
    expect(order.status).toBe('confirmed')

    // ราคาต้องมาจาก DB ไม่ใช่จากที่ client ส่ง (client ไม่ได้ส่งราคามาด้วยซ้ำ)
    expect(order.total_price).toBe(product.price * 2)
    expect(order.items[0].unit_price).toBe(product.price)

    // Snapshot ชื่อสินค้า ณ เวลาที่สั่ง
    expect(order.items[0].product_name).toBe(product.name)

    const after = await api()
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(after.body.stock).toBe(stockBefore - 2)
  })

  it('ราคาที่ client แอบส่งมาถูกเพิกเฉย', async () => {
    const { token } = await registerCustomer()
    const product = await pickProduct(token)

    const res = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: product.id, quantity: 1, unit_price: 1, price: 1 }],
      })

    expect(res.status).toBe(200)
    expect(res.body.order.total_price).toBe(product.price)
  })
})

describe('Transaction ต้อง rollback ทั้งชุด', () => {
  it('สั่งเกิน stock ได้ 400 และไม่มีทั้งแถวใหม่และการตัด stock', async () => {
    const { token } = await registerCustomer()
    const product = await pickProduct(token)

    const before = await api().get('/api/orders').set('Authorization', `Bearer ${token}`)
    const stockBefore = product.stock

    const res = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ product_id: product.id, quantity: 999999 }] })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Insufficient stock')

    const after = await api().get('/api/orders').set('Authorization', `Bearer ${token}`)
    expect(after.body.orders.length).toBe(before.body.orders.length)

    const stockAfter = await api()
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(stockAfter.body.stock).toBe(stockBefore)
  })

  it('สินค้าตัวที่สองไม่พอ ต้องไม่ตัด stock ของตัวแรกที่ผ่านไปแล้ว', async () => {
    const { token } = await registerCustomer()
    const res = await api().get('/api/products').set('Authorization', `Bearer ${token}`)
    const [good, short] = res.body.filter((p: { stock: number }) => p.stock >= 5)

    const stockBefore = good.stock

    const failed = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { product_id: good.id, quantity: 1 },
          { product_id: short.id, quantity: 999999 },
        ],
      })

    expect(failed.status).toBe(400)

    // จุดที่ callback-style เขียนพลาดกันบ่อย: ตัด stock ตัวแรกไปแล้วค่อยเจอว่าตัวที่สอง
    // ไม่พอ ถ้าไม่มี Transaction ครอบ stock ตัวแรกจะหายไปฟรี ๆ
    const good2 = await api()
      .get(`/api/products/${good.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(good2.body.stock).toBe(stockBefore)
  })
})

describe('Validation ของ POST /api/orders', () => {
  const cases: [string, unknown][] = [
    ['items ว่าง', []],
    ['ไม่ส่ง items มาเลย', undefined],
  ]

  it.each(cases)('%s ได้ 400', async (_label, items) => {
    const { token } = await registerCustomer()

    const res = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(items === undefined ? {} : { items })

    expect(res.status).toBe(400)
  })

  it.each([0, -5, 1.5])('quantity = %s ได้ 400', async (quantity) => {
    const { token } = await registerCustomer()
    const product = await firstProduct(token)

    const res = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ product_id: product.id, quantity }] })

    expect(res.status).toBe(400)
  })

  it('product_id ที่ไม่มีอยู่จริงได้ 400', async () => {
    const { token } = await registerCustomer()

    const res = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ product_id: 999999, quantity: 1 }] })

    expect(res.status).toBe(400)
  })
})

describe('ประวัติการสั่งซื้อเป็นของใครของมัน', () => {
  it('GET /api/orders เห็นเฉพาะของตัวเอง', async () => {
    const buyer = await registerCustomer()
    const stranger = await registerCustomer()
    const product = await pickProduct(buyer.token)

    await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })

    const mine = await api().get('/api/orders').set('Authorization', `Bearer ${buyer.token}`)
    expect(mine.status).toBe(200)
    expect(mine.body.orders.length).toBe(1)

    const theirs = await api()
      .get('/api/orders')
      .set('Authorization', `Bearer ${stranger.token}`)
    expect(theirs.body.orders.length).toBe(0)
  })

  it('เปิด order ของคนอื่นได้ 403', async () => {
    const buyer = await registerCustomer()
    const stranger = await registerCustomer()
    const product = await pickProduct(buyer.token)

    const created = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })

    const orderId = created.body.order.id

    const forbidden = await api()
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
    expect(forbidden.status).toBe(403)

    const allowed = await api()
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
    expect(allowed.status).toBe(200)
    expect(allowed.body.order.items.length).toBe(1)
  })

  it('order ที่ไม่มีอยู่ได้ 404', async () => {
    const { token } = await registerCustomer()

    const res = await api().get('/api/orders/999999').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
