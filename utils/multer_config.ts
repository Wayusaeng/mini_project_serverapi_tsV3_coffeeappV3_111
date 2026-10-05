import { Request } from "express"
import multer, { FileFilterCallback } from "multer"
import path from "path"
import fs from "fs"

const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, destination: string) => void
  ) => {
    const folder = "./uploads/images/"
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true })
    }
    callback(null, folder)
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, filename: string) => void
  ) => {
    // ป้องกันกรณี mimetype เป็นค่าว่าง ให้ดึงนามสกุลจากชื่อไฟล์จริงแทน
    const ext = path.extname(file.originalname) || ".jpg"
    callback(null, `${file.fieldname}-${Date.now()}${ext}`)
  },
})

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  // ยืดหยุ่นให้รองรับทั้ง image/*, octet-stream และกรณีที่ mimetype ว่างบนเว็บ
  if (
    !file.mimetype ||
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/octet-stream"
  ) {
    callback(null, true)
  } else {
    callback(new Error("Not an image! Please upload an image."))
  }
}

const multerConfig = {
  config: {
    storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter,
  },
  keyUpload: "photo",
}

export default multerConfig