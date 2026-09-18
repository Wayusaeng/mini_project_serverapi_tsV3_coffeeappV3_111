import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { Request, Response } from "express"
import connection from "../utils/db" // Ensure this file is also converted to TypeScript

// Define types for the user inputs
interface UserInput {
  firstname: string
  lastname: string
  email: string
  password: string
}

// feature.md B2 (ปิด G5) — Token ต้องมีวันหมดอายุ
//
// เดิม jwt.sign() ไม่ใส่ expiresIn เลย token ที่หลุดออกไปจึงใช้ได้ตลอดกาล ไม่มีทาง
// ยกเลิกได้นอกจากเปลี่ยน JWT_SECRET ทั้งระบบ (ซึ่งเตะทุกคนออกพร้อมกัน)
//
// ตั้งค่าผ่าน .env ได้เพื่อให้สาธิตในห้องเรียนง่าย — ตั้ง JWT_EXPIRES_IN=30s แล้ว
// รอครึ่งนาที จะเห็นแอปเด้งกลับหน้า Login เองโดยไม่ต้องรอหนึ่งชั่วโมง
function signToken(payload: { id: number; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET || "", {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  })
}

// Register function
async function register(req: Request, res: Response): Promise<void> {
  const { firstname, lastname, email, password }: UserInput = req.body

  // Check if the user already exists
  try {
    connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
      function (err, results: any, fields) {
        if (err) {
          res.status(500).json({ status: "error", message: err })
          return
        } else {
          if (results.length > 0) {
            // feature.md B3 (ปิด G6): 409 Conflict คือรหัสที่ตรงความหมายที่สุด —
            // request ถูกต้องทุกอย่าง แต่ชนกับข้อมูลที่มีอยู่แล้วในระบบ
            res.status(409).json({ status: "error", message: "Email already exists" })
            return
          } else {
            // Hash the password
            bcrypt.hash(password, 10, function (err, hash) {
              if (err) {
                res.status(500).json({ status: "error", message: err })
                return
              } else {
                // Store the user in the database
                const query =
                  "INSERT INTO users (firstname, lastname, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())"
                const values = [firstname, lastname, email, hash]

                // Insert the new user into the database
                connection.execute(
                  query,
                  values,
                  function (err, results: any, fields) {
                    if (err) {
                      res.status(500).json({ status: "error", message: err })
                      return
                    } else {
                      // ผู้สมัครใหม่ได้ role 'customer' เสมอ ตรงกับ defaultTo ของ
                      // migration 20260917120000_add_role_to_users — สมัครเองแล้ว
                      // เป็น admin ไม่ได้ ต้องให้คนที่เป็น admin อยู่แล้วตั้งให้ใน DB
                      const role = "customer"

                      // Generate JWT token for the registered user
                      const token = signToken({
                        id: results.insertId,
                        email,
                        role,
                      })

                      // 201 Created — สร้างทรัพยากรใหม่สำเร็จ ไม่ใช่ 200 OK เฉย ๆ
                      res.status(201).json({
                        status: "ok",
                        message: "User registered successfully",
                        token: token,
                        user: {
                          id: results.insertId,
                          firstname: firstname,
                          lastname: lastname,
                          email: email,
                          role: role,
                        },
                      })
                    }
                  }
                )
              }
            })
          }
        }
      }
    )
  } catch (err) {
    console.error("Error storing user in the database: ", err)
    res.sendStatus(500)
  }
}

// Login function
async function login(req: Request, res: Response): Promise<void> {
  const { email, password }: UserInput = req.body

  try {
    connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
      function (err, results: any, fields) {
        if (err) {
          res.status(500).json({ status: "error", message: err })
          return
        } else {
          if (results.length > 0) {
            // Compare the password with the hash
            bcrypt.compare(
              password,
              results[0].password,
              function (err, result) {
                if (err) {
                  res.status(500).json({ status: "error", message: err })
                  return
                } else {
                  if (result) {
                    // user ที่สมัครไว้ก่อนมี column role จะได้ 'customer' จาก
                    // defaultTo ของ migration อยู่แล้ว ?? ไว้กันกรณี DB ยังไม่ migrate
                    const role = results[0].role ?? "customer"

                    // Generate JWT token for the registered user
                    //
                    // feature.md A2/B1: payload ต้องมี id เพราะ Order API ต้องรู้ว่า
                    // order เป็นของใคร และต้องมี role เพราะ requireAdmin ต้องตัดสินสิทธิ์
                    // ได้โดยไม่ต้อง query ตาราง users ซ้ำทุก request
                    //
                    // ⚠️ Breaking change: token ที่ออกก่อนหน้านี้มีแค่ { email } จึงใช้กับ
                    // endpoint ใหม่ไม่ได้ — ผู้ใช้เดิมทุกคนต้อง Login ใหม่หนึ่งครั้ง
                    const token = signToken({ id: results[0].id, email, role })

                    res.json({
                      status: "ok",
                      message: "User logged in successfully",
                      token: token,
                      user: {
                        id: results[0].id,
                        firstname: results[0].firstname,
                        lastname: results[0].lastname,
                        email: results[0].email,
                        role: role,
                      },
                    })
                  } else {
                    // 401 Unauthorized — ยังพิสูจน์ตัวตนไม่ผ่าน (ต่างจาก 403 ที่
                    // พิสูจน์แล้วแต่ไม่มีสิทธิ์ ดู middleware/requireAdmin.ts)
                    res.status(401).json({
                      status: "error",
                      message: "Email and password does not match",
                    })
                    return
                  }
                }
              }
            )
          } else {
            res.status(401).json({ status: "error", message: "Email does not exists" })
            return
          }
        }
      }
    )
  } catch (err) {
    console.error("Error querying the database: ", err)
    res.sendStatus(500)
  }
}

export { register, login }
