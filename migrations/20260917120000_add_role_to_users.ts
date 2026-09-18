// Feature B1 (feature.md ข้อ 3.2) — แยก Authentication ออกจาก Authorization
//
// ก่อนหน้านี้ตาราง users ไม่มีข้อมูลว่าใครเป็นใคร ทำให้ token ทุกใบมีสิทธิ์เท่ากันหมด
// column นี้คือสิ่งที่ทำให้ backend ตอบคำถาม "เป็นใคร" ได้ ไม่ใช่แค่ "มี token หรือไม่"
//
// user เดิมทุกคนได้ 'customer' อัตโนมัติจาก defaultTo — ไม่มีใครถูกยกระดับเป็น admin
// โดยบังเอิญ บัญชี admin สร้างแยกผ่าน seeds/users.ts
exports.up = function (knex: any) {
  return knex.schema.table('users', function (table: any) {
    table.enu('role', ['customer', 'admin']).notNullable().defaultTo('customer')
  })
}

exports.down = function (knex: any) {
  return knex.schema.table('users', function (table: any) {
    table.dropColumn('role')
  })
}
