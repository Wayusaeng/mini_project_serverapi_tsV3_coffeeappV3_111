import express, { Router } from 'express'
import * as orderController from '../controllers/orderController'
import authenticateToken from '../middleware/authMiddleware'

// Initialize router
const router: Router = express.Router()

// feature.md A2: ทุก endpoint ต้อง Login ก่อน แต่ไม่ต้องเป็น admin — การสั่งซื้อและ
// ดูประวัติเป็นเรื่องของลูกค้า สิทธิ์จึงจำกัดด้วย user_id ใน controller ไม่ใช่ด้วย role

// Create order
router.post('/', authenticateToken, orderController.createOrder)

// Get my orders
router.get('/', authenticateToken, orderController.getOrders)

// Get one order (owner only)
router.get('/:orderId', authenticateToken, orderController.getOrderById)

export default router
