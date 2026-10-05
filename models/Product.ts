// Define an interface for the product data
interface ProductData {
  name: string
  description: string
  barcode: string
  image: string | null
  stock: number
  price: number
  rating?: number     // เพิ่มฟิลด์คะแนนดาว
  soldCount?: number  // เพิ่มฟิลด์จำนวนที่ขายได้
  categoryId: number
  userId: number
  statusId: number
}

class Product {
  name: string
  description: string
  barcode: string
  image: string | null
  stock: number
  price: number
  rating: number      // เพิ่มฟิลด์คะแนนดาว
  soldCount: number   // เพิ่มฟิลด์จำนวนที่ขายได้
  categoryId: number
  userId: number
  statusId: number

  constructor(data: ProductData) {
    this.name = data.name
    this.description = data.description
    this.barcode = data.barcode
    this.image = data.image
    this.stock = data.stock
    this.price = data.price
    this.rating = data.rating ?? 4.8     // ค่าเริ่มต้นถ้าไม่ได้ส่งมา
    this.soldCount = data.soldCount ?? 0 // ค่าเริ่มต้นถ้าไม่ได้ส่งมา
    this.categoryId = data.categoryId
    this.userId = data.userId
    this.statusId = data.statusId
  }
}

export default Product