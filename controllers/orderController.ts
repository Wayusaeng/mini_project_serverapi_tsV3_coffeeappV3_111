import { Response } from "express"
import { JwtPayload } from "jsonwebtoken"
import { RowDataPacket, ResultSetHeader } from "mysql2"
import { RequestWithUser } from "../middleware/authMiddleware"
import { db } from "../utils/db"

// feature.md A2 / challenges.md ข้อ 6 — Order API
//
// controller ตัวนี้เขียนด้วย Promise + async/await ต่างจาก authController/productController
// ที่เป็น callback เพราะงานสร้าง Order ต้องทำหลายคำสั่งเรียงกันในหนึ่ง Transaction
// เขียนแบบ callback จะซ้อนกัน 4-5 ชั้นจนอ่านลำดับขั้นตอนไม่ออก

interface OrderItemInput {
  product_id: number
  quantity: number
}

// user id มาจาก token ที่ผ่านการตรวจลายเซ็นแล้วเท่านั้น ไม่เคยรับจาก body
// (ถ้ารับจาก body ใครก็สั่งซื้อในนามคนอื่น หรือดูประวัติของคนอื่นได้)
function currentUserId(req: RequestWithUser): number | null {
  const user = req.user as JwtPayload | undefined
  if (!user || typeof user === "string") return null

  const id = Number(user.id)
  return Number.isInteger(id) ? id : null
}

//----------------------------------------
// POST /api/orders
//----------------------------------------
async function createOrder(req: RequestWithUser, res: Response) {
  const userId = currentUserId(req)
  if (userId === null) {
    res.status(401).json({
      status: "error",
      // token รุ่นเก่าที่ sign ด้วย { email } เท่านั้นจะมาตกที่นี่
      message: "Invalid token payload: please log in again",
    })
    return
  }

  const items: OrderItemInput[] = req.body?.items

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ status: "error", message: "items is required" })
    return
  }

  for (const item of items) {
    const quantity = Number(item?.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({
        status: "error",
        message: `Invalid quantity for product_id ${item?.product_id}`,
      })
      return
    }
  }

  // ขอ connection เฉพาะตัวจาก pool — ห้ามสั่ง BEGIN บน pool ตรง ๆ เพราะแต่ละคำสั่ง
  // อาจถูกส่งไปคนละ connection แล้ว Transaction จะไม่ครอบคลุมอย่างที่คิด
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const lines: {
      product_id: number
      product_name: string
      unit_price: number
      quantity: number
      subtotal: number
    }[] = []

    let totalPrice = 0

    for (const item of items) {
      const productId = Number(item.product_id)
      const quantity = Number(item.quantity)

      // FOR UPDATE ล็อกแถวไว้จนกว่า Transaction จะจบ — กันกรณีสองคนสั่งสินค้าชิ้น
      // สุดท้ายพร้อมกันแล้วต่างฝ่ายต่างอ่านเห็น stock = 1 เหมือนกันทั้งคู่
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE",
        [productId]
      )

      if (rows.length === 0) {
        await connection.rollback()
        res.status(400).json({
          status: "error",
          message: `Product ${productId} does not exist`,
        })
        return
      }

      const product = rows[0]

      if (product.stock < quantity) {
        await connection.rollback()
        res.status(400).json({
          status: "error",
          message: `Insufficient stock for product_id ${productId} (have ${product.stock}, requested ${quantity})`,
        })
        return
      }

      // ราคามาจาก DB เสมอ ไม่เคยอ่านราคาที่ client ส่งมา — ไม่อย่างนั้นใครก็สั่ง
      // กาแฟราคา 1 บาทได้ด้วยการแก้ request ก่อนส่ง
      const unitPrice = Number(product.price)
      const subtotal = unitPrice * quantity
      totalPrice += subtotal

      lines.push({
        product_id: productId,
        product_name: String(product.name),
        unit_price: unitPrice,
        quantity,
        subtotal,
      })
    }

    const [orderResult] = await connection.execute<ResultSetHeader>(
      "INSERT INTO orders (user_id, status, total_price, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [userId, "confirmed", totalPrice]
    )

    const orderId = orderResult.insertId

    for (const line of lines) {
      await connection.execute(
        "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          orderId,
          line.product_id,
          line.product_name,
          line.unit_price,
          line.quantity,
          line.subtotal,
        ]
      )

      await connection.execute(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [line.quantity, line.product_id]
      )
    }

    // ถึงบรรทัดนี้แล้วเท่านั้นที่ข้อมูลทั้งหมดถูกเขียนจริง — ถ้าพังกลางทาง
    // catch ด้านล่างจะ rollback ทิ้งทั้งชุด ไม่มี order ค้างที่ไม่มีรายการสินค้า
    await connection.commit()

    res.json({
      status: "ok",
      message: "Order created successfully",
      order: {
        id: orderId,
        user_id: userId,
        status: "confirmed",
        total_price: totalPrice,
        items: lines,
      },
    })
  } catch (err) {
    await connection.rollback()
    console.error("Error creating order: ", err)
    res.status(500).json({ status: "error", message: "Cannot create order" })
  } finally {
    // คืน connection เข้า pool เสมอ ไม่ว่าจะสำเร็จหรือไม่ — ลืมบรรทัดนี้แล้ว pool
    // จะหมดหลังสั่งซื้อครบ 10 ครั้ง และ API จะค้างโดยไม่มี error
    connection.release()
  }
}

//----------------------------------------
// GET /api/orders
//----------------------------------------
async function getOrders(req: RequestWithUser, res: Response) {
  const userId = currentUserId(req)
  if (userId === null) {
    res.status(401).json({
      status: "error",
      message: "Invalid token payload: please log in again",
    })
    return
  }

  try {
    // WHERE user_id = ? คือบรรทัดที่กันไม่ให้ผู้ใช้คนหนึ่งเห็นประวัติของคนอื่น
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id, status, total_price, created_at FROM orders WHERE user_id = ? ORDER BY id DESC",
      [userId]
    )

    res.json({ status: "ok", orders: rows })
  } catch (err) {
    console.error("Error loading orders: ", err)
    res.status(500).json({ status: "error", message: "Cannot load orders" })
  }
}

//----------------------------------------
// GET /api/orders/:orderId
//----------------------------------------
async function getOrderById(req: RequestWithUser, res: Response) {
  const userId = currentUserId(req)
  if (userId === null) {
    res.status(401).json({
      status: "error",
      message: "Invalid token payload: please log in again",
    })
    return
  }

  try {
    const [orderRows] = await db.execute<RowDataPacket[]>(
      "SELECT id, user_id, status, total_price, created_at FROM orders WHERE id = ?",
      [req.params.orderId]
    )

    if (orderRows.length === 0) {
      res.status(404).json({ status: "error", message: "Order not found" })
      return
    }

    const order = orderRows[0]

    // เจ้าของเท่านั้นที่ดูได้ — ตอบ 403 ไม่ใช่ปล่อยข้อมูลออกไปเฉย ๆ
    if (Number(order.user_id) !== userId) {
      res.status(403).json({ status: "error", message: "Forbidden" })
      return
    }

    const [itemRows] = await db.execute<RowDataPacket[]>(
      "SELECT product_id, product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = ? ORDER BY id",
      [order.id]
    )

    // ตอบเป็น Object เดี่ยว ไม่ใช่ Array — ตั้งใจแก้ปัญหาที่ GET /api/products/:id
    // ทิ้งไว้ (ดู feature.md G7) ตั้งแต่ endpoint แรกที่เขียนใหม่ ฝั่ง client จะได้
    // ไม่ต้องเขียนโค้ดพิเศษมารองรับ Array
    res.json({
      status: "ok",
      order: { ...order, items: itemRows },
    })
  } catch (err) {
    console.error("Error loading order: ", err)
    res.status(500).json({ status: "error", message: "Cannot load order" })
  }
}

export { createOrder, getOrders, getOrderById }
