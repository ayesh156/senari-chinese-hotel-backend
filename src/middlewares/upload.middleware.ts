import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/foods');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `food-${uniqueSuffix}${ext}`);
  },
});

// 🌟 Universal Image Upload Filter: Accepts ALL image extensions (webp, avif, png, jpeg, jpg, svg, heic, etc.)
// Prevents Multer from dropping webp and uncommon image formats
export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit for high-res food photos
  fileFilter: (_req, file, cb) => {
    const isMimeImage = file.mimetype.startsWith('image/');
    const allowedExts = /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg|tiff|heic|heif)$/i;
    const isExtImage = allowedExts.test(path.extname(file.originalname).toLowerCase());

    if (isMimeImage || isExtImage) {
      cb(null, true);
    } else {
      cb(new Error('Selected file is not an image. Please upload a valid image file.'));
    }
  },
});