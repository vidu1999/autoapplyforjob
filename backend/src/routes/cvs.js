import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { asyncHandler } from '../utils.js';
import { deleteCv, listCvs, saveCv } from '../services/storage.js';
import { parsePdf } from '../services/cv.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPdfBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      return callback(Object.assign(new Error('Only PDF CV files are accepted.'), { status: 400 }));
    }
    callback(null, true);
  },
});

export const cvRouter = Router();

cvRouter.get('/', asyncHandler(async (_req, res) => res.json({ cvs: await listCvs() })));

cvRouter.post(
  '/',
  upload.single('cv'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose a PDF CV to upload.' });
    const parsed = await parsePdf(req.file.buffer);
    const cv = await saveCv({
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      extractedText: parsed.text,
      profile: { ...parsed.profile, pages: parsed.pages },
    });
    res.status(201).json({ cv });
  }),
);

cvRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await deleteCv(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'CV not found.' });
    res.status(204).end();
  }),
);
