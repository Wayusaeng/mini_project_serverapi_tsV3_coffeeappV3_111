import { Request, Response } from "express"
import { JwtPayload } from "jsonwebtoken"
import { RequestWithUser } from "../middleware/authMiddleware"
import multer from "multer"
import multerConfig from "../utils/multer_config"
import connection from "../utils/db"

const upload = multer(multerConfig.config).single(multerConfig.keyUpload)

//----------------------------------------
// Get all products
//----------------------------------------
function getAllProducts(req: Request, res: Response) {
  try {
    connection.execute(
      "SELECT * FROM products ORDER BY id DESC",
      function (err, results) {
        if (err) {
          res.status(500).json({ status: "error", message: err });
          return;
        } else {
          res.json(results);
        }
      }
    );
  } catch (err) {
    console.error("Error storing product in the database: ", err);
    res.sendStatus(500);
  }
}

//----------------------------------------
// Get product by id
//----------------------------------------
function getProductById(req: Request, res: Response) {
  try {
    connection.execute(
      "SELECT * FROM products WHERE id = ?",
      [req.params.productId],
      function (err, results: any) {
        if (err) {
          res.status(500).json({ status: "error", message: err })
          return
        }

        // feature.md B3 (ปิด G7): คืน Object เดี่ยว ไม่ใช่ Array
        //
        // เดิมส่ง `results` ดิบจาก mysql2 ซึ่งเป็น Array เสมอแม้ query ด้วย id เดียว
        // ทำให้ ProductService.getProductById() ฝั่ง Flutter ต้องเขียน
        // `data is List ? data.first : data` มารองรับ — แก้ที่ต้นเหตุครั้งเดียว
        // ดีกว่าให้ client ทุกตัวไปแก้เอง (ตอนนี้มี client 1 ตัว ถ้ามีเว็บด้วยก็ 2 ที่)
        if (!results || results.length === 0) {
          res.status(404).json({ status: "error", message: "Product not found" })
          return
        }

        res.json(results[0])
      }
    )
  } catch (err) {
    console.error("Error storing product in the database: ", err)
    res.sendStatus(500)
  }
}

//----------------------------------------
// Create product
//----------------------------------------
function createProduct(req: RequestWithUser, res: Response) {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.log(`error: ${JSON.stringify(err)}`)
      return res.status(500).json({ message: err })
    } else if (err) {
      console.log(`error: ${JSON.stringify(err)}`)
      return res.status(500).json({ message: err })
    } else {
      // console.log(`file: ${JSON.stringify(req.file)}`)
      // console.log(`body: ${JSON.stringify(req.body)}`)
      try {
        const {
          name,
          description,
          barcode,
          stock,
          price,
          category_id,
          status_id,
        } = req.body

        // feature.md B1: เจ้าของสินค้ามาจาก token ไม่ใช่จาก body ที่ client ส่งมา
        //
        // เดิม client ส่ง user_id มาเองใน multipart แปลว่าใครก็ตั้งตัวเองเป็นเจ้าของ
        // สินค้าของคนอื่นได้ด้วยการแก้ค่าที่ส่ง — ตอนนี้ requireAdmin ทำให้แน่ใจแล้วว่า
        // req.user มีอยู่จริงและผ่านการตรวจลายเซ็นมาแล้ว จึงเชื่อค่านี้ได้
        const user_id = (req.user as JwtPayload).id
        const image = req.file ? req.file.filename : null
        console.log(req.file)
        connection.execute(
          "INSERT INTO products (name, description, barcode, image, stock, price, category_id, user_id, status_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            name,
            description,
            barcode,
            image,
            stock,
            price,
            category_id,
            user_id,
            status_id,
          ],
          function (err, results: any) {
            if (err) {
              res.status(500).json({ status: "error", message: err })
              return
            } else {
              res.status(201).json({
                status: "ok",
                message: "Product created successfully",
                product: {
                  id: results.insertId,
                  name: name,
                  description: description,
                  barcode: barcode,
                  image: image,
                  stock: stock,
                  price: price,
                  category_id: category_id,
                  user_id: user_id,
                  status_id: status_id,
                },
              })
            }
          }
        )
      } catch (err) {
        console.error("Error storing product in the database: ", err)
        res.sendStatus(500)
      }
    }
  })
}

//----------------------------------------
// Update product
//----------------------------------------
function updateProduct(req: Request, res: Response) {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.log(`error: ${JSON.stringify(err)}`)
      return res.status(500).json({ message: err })
    } else if (err) {
      console.log(`error: ${JSON.stringify(err)}`)
      return res.status(500).json({ message: err })
    } else {
      console.log(`file: ${JSON.stringify(req.file)}`)
      console.log(`body: ${JSON.stringify(req.body)}`)
      try {
        // ดึงข้อมูลสินค้าปัจจุบันไว้ก่อน เพื่อใช้เป็นค่า fallback สำหรับฟิลด์
        // ที่ client ไม่ได้ส่งมาใน request (เดิมถ้าไม่ส่ง user_id มา ค่าจะเป็น
        // undefined แล้ว connection.execute() throw ทันทีเพราะ MySQL bind
        // parameter ห้ามเป็น undefined ทำให้ตอบ 500 กลับไปเสมอ)
        connection.execute(
          "SELECT * FROM products WHERE id = ?",
          [req.params.productId],
          function (err, results: any) {
            if (err) {
              res.status(500).json({ status: "error", message: err })
              return
            }
            if (!results || results.length === 0) {
              res.status(404).json({ status: "error", message: "Product not found" })
              return
            }

            const current = results[0]
            const name = req.body.name ?? current.name
            const description = req.body.description ?? current.description
            const barcode = req.body.barcode ?? current.barcode
            const stock = req.body.stock ?? current.stock
            const price = req.body.price ?? current.price
            const category_id = req.body.category_id ?? current.category_id
            // ไม่รับ user_id จาก body เช่นกัน — แก้ไขสินค้าแล้วเจ้าของต้องไม่เปลี่ยนมือ
            const user_id = current.user_id
            const status_id = req.body.status_id ?? current.status_id
            const image = req.file ? req.file.filename : current.image

            const sql =
              "UPDATE products SET name = ?, description = ?, barcode = ?, image = ?, stock = ?, price = ?, category_id = ?, user_id = ?, status_id = ? WHERE id = ?"
            const params = [
              name,
              description,
              barcode,
              image,
              stock,
              price,
              category_id,
              user_id,
              status_id,
              req.params.productId,
            ]

            connection.execute(sql, params, function (err) {
              if (err) {
                res.status(500).json({ status: "error", message: err })
                return
              } else {
                res.json({
                  status: "ok",
                  message: "Product updated successfully",
                  product: {
                    id: req.params.productId,
                    name: name,
                    description: description,
                    barcode: barcode,
                    image: image,
                    stock: stock,
                    price: price,
                    category_id: category_id,
                    user_id: user_id,
                    status_id: status_id,
                  },
                })
              }
            })
          }
        )
      } catch (err) {
        console.error("Error storing product in the database: ", err)
        res.sendStatus(500)
      }
    }
  })
}

//----------------------------------------
// Delete product
//----------------------------------------
function deleteProduct(req: Request, res: Response) {
  try {
    connection.execute(
      "DELETE FROM products WHERE id = ?",
      [req.params.productId],
      function (err, results: any) {
        if (err) {
          res.status(500).json({ status: "error", message: err })
          return
        } else {
          // feature.md B3: ลบของที่ไม่มีอยู่ ต้องไม่ตอบ "ลบสำเร็จ"
          //
          // เดิมตอบ 200 เสมอเพราะไม่เคยดู affectedRows — client จึงไม่มีทางแยกออกว่า
          // ลบได้จริงหรือ id ผิด (เจอตอนเดินเกณฑ์ผ่านด้วย curl ไม่ใช่ตอนอ่านโค้ด)
          if (!results || results.affectedRows === 0) {
            res.status(404).json({ status: "error", message: "Product not found" })
            return
          }

          res.json({
            status: "ok",
            message: "Product deleted successfully",
            product: {
              id: req.params.productId,
            },
          })
        }
      }
    )
    // Delete file from server
    const fs = require("fs")
    const path = require("path")
    const filePath = path.join(
      __dirname,
      "../public/uploads/",
      req.params.productId
    )
  } catch (err) {
    console.error("Error storing product in the database: ", err)
    res.sendStatus(500)
  }
}

export {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}
