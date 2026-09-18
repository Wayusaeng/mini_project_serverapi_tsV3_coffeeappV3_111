import express, { Router } from 'express'
import * as productController from '../controllers/productController'
import authenticateToken from '../middleware/authMiddleware'
import requireAdmin from '../middleware/requireAdmin'

// Initialize router
const router: Router = express.Router()

// Get all products
router.get('/', authenticateToken, productController.getAllProducts)

// Get product by id
router.get('/:productId', authenticateToken, productController.getProductById)

// feature.md B1: อ่าน (GET) ใครที่ Login แล้วก็ทำได้ แต่เขียน (POST/PUT/DELETE)
// ต้องเป็น admin เท่านั้น — การซ่อนปุ่ม Admin ใน Flutter ไม่ได้กันอะไรเลย
// ถ้าบรรทัดพวกนี้ไม่มี requireAdmin ต่อท้าย

// Create product
router.post('/', authenticateToken, requireAdmin, productController.createProduct)

// Update product
router.put('/:productId', authenticateToken, requireAdmin, productController.updateProduct)

// Delete product
router.delete('/:productId', authenticateToken, requireAdmin, productController.deleteProduct)

export default router