import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const uploadDirectory = fileURLToPath(new URL('../uploads/feed/', import.meta.url));
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedImageTypes = new Map([
  ['image/jpeg', { extension: '.jpg', acceptedExtensions: ['.jpg', '.jpeg'] }],
  ['image/png', { extension: '.png', acceptedExtensions: ['.png'] }],
  ['image/webp', { extension: '.webp', acceptedExtensions: ['.webp'] }],
  ['image/gif', { extension: '.gif', acceptedExtensions: ['.gif'] }]
]);

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const { extension } = allowedImageTypes.get(file.mimetype);
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  }
});

const imageUpload = multer({
  storage,
  fileFilter: (req, file, callback) => {
    const imageType = allowedImageTypes.get(file.mimetype);
    const actualExtension = path.extname(file.originalname).toLowerCase();
    if (!imageType || !imageType.acceptedExtensions.includes(actualExtension)) {
      const error = new Error('Upload a JPG, PNG, WEBP, or GIF image.');
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

export { imageUpload, uploadDirectory };
