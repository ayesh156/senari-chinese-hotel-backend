import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';

const router = Router();

// ── Multer configuration ────────────────────────────────────────────────
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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
    }
  },
});

// ── Helper: build image URL relative to server ─────────────────────────
function getImageUrl(filename: string | undefined): string | null {
  if (!filename) return null;
  return `/uploads/foods/${filename}`;
}

// ── Helper: parse multipart form fields ────────────────────────────────
function parseFormBody(body: Record<string, any>) {
  return {
    name: body.name,
    price: body.price !== undefined ? parseFloat(body.price) : undefined,
    description: body.description || undefined,
    categoryId: body.categoryId ? parseInt(body.categoryId, 10) : undefined,
    isAvailable: body.isAvailable !== undefined ? body.isAvailable === 'true' || body.isAvailable === true : undefined,
    isNew: body.isNew !== undefined ? body.isNew === 'true' || body.isNew === true : undefined,
    image: undefined as string | undefined, // handled separately
  };
}

// GET /api/foods — new items first
router.get('/', async (_req: Request, res: Response) => {
  try {
    const foods = await prisma.foodItem.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[DB] GET /foods → ${foods.length} rows`);
    res.json({ success: true, data: foods });
  } catch (error) {
    console.error('[DB] GET /foods ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch food items' });
  }
});

// GET /api/foods/:id — single food item for editing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const food = await prisma.foodItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!food) {
      res.status(404).json({ success: false, error: 'Food item not found' });
      return;
    }
    console.log(`[DB] GET /foods/${id} → found "${food.name}"`);
    res.json({ success: true, data: food });
  } catch (error) {
    console.error('[DB] GET /foods/:id ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch food item' });
  }
});

// POST /api/foods — multipart/form-data (field: image)
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const fields = parseFormBody(req.body);
    if (!fields.name || fields.price === undefined || !fields.categoryId) {
      res.status(400).json({ success: false, error: 'Name, price, and categoryId are required' });
      return;
    }

    const imagePath = req.file ? getImageUrl(req.file.filename) : undefined;

    const food = await prisma.foodItem.create({
      data: {
        name: fields.name,
        price: fields.price,
        description: fields.description,
        categoryId: fields.categoryId,
        isAvailable: fields.isAvailable ?? true,
        isNew: fields.isNew ?? false,
        image: imagePath,
      },
      include: { category: true },
    });
    console.log(`[DB] POST /foods → created "${food.name}" id=${food.id} image=${imagePath || 'none'}`);
    res.status(201).json({ success: true, data: food });
  } catch (error) {
    console.error('[DB] POST /foods ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to create food item' });
  }
});

// PUT /api/foods/:id — multipart/form-data (field: image, optional)
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const fields = parseFormBody(req.body);

    const data: Record<string, any> = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.price !== undefined) data.price = fields.price;
    if (fields.description !== undefined) data.description = fields.description;
    if (fields.categoryId !== undefined) data.categoryId = fields.categoryId;
    if (fields.isAvailable !== undefined) data.isAvailable = fields.isAvailable;
    if (fields.isNew !== undefined) data.isNew = fields.isNew;

    // Handle image: new file uploaded
    if (req.file) {
      data.image = getImageUrl(req.file.filename);
    }

    const food = await prisma.foodItem.update({
      where: { id },
      data,
      include: { category: true },
    });
    console.log(`[DB] PUT /foods/${id} → updated "${food.name}"`);
    res.json({ success: true, data: food });
  } catch (error) {
    console.error('[DB] PUT /foods ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update food item' });
  }
});

// DELETE /api/foods/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    // Optionally delete the image file from disk
    const existing = await prisma.foodItem.findUnique({ where: { id } });
    if (existing?.image) {
      const filename = path.basename(existing.image);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FS] Deleted image: ${filePath}`);
      }
    }

    await prisma.foodItem.delete({ where: { id } });
    console.log(`[DB] DELETE /foods/${id} → deleted`);
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('[DB] DELETE /foods ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete food item' });
  }
});

export default router;