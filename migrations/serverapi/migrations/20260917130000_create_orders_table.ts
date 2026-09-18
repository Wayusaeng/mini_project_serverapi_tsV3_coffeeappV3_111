// Feature A2 (feature.md ข้อ 3.1) — implement ตามแบบที่ออกไว้แล้วใน challenges.md ข้อ 6
//
// สองตาราง ไม่ใช่ตารางเดียว เพราะหนึ่งคำสั่งซื้อมีได้หลายรายการสินค้า
//
// ไม่ใส่ Foreign Key Constraint จริง เพื่อให้สอดคล้องกับตาราง products เดิมที่
// category_id/status_id เป็น column ตัวเลขธรรมดา (ดู backendapi.md ข้อ 3)
exports.up = async function (knex: any) {
  await knex.schema.createTable('orders', function (table: any) {
    table.increments('id').primary()
    table.integer('user_id').unsigned().notNullable()
    // MVP ไม่มี payment gateway จึง confirm ทันทีตั้งแต่สร้าง
    table.string('status').notNullable().defaultTo('confirmed')
    table.integer('total_price').notNullable()
    table.timestamps(true, true)
  })

  await knex.schema.createTable('order_items', function (table: any) {
    table.increments('id').primary()
    table.integer('order_id').unsigned().notNullable()
    table.integer('product_id').unsigned().notNullable()

    // Snapshot ชื่อและราคา ณ เวลาที่สั่งซื้อ — ไม่ JOIN สดจาก products
    //
    // เพราะระบบมี Admin Product CRUD ที่แก้ราคาหรือลบสินค้าได้ ถ้าอ้างอิงราคาปัจจุบัน
    // ประวัติเก่าจะแสดงราคาผิดไปจากที่ลูกค้าจ่ายจริง และถ้าสินค้าถูกลบก็ JOIN ไม่เจอเลย
    table.string('product_name').notNullable()
    table.integer('unit_price').notNullable()

    table.integer('quantity').notNullable()
    table.integer('subtotal').notNullable()
    table.timestamps(true, true)
  })
}

exports.down = async function (knex: any) {
  await knex.schema.dropTable('order_items')
  await knex.schema.dropTable('orders')
}
