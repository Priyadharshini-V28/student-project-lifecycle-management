import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { validateFileType } from '../validators/document.validator';

// Ensure base upload directory exists
const getUploadDir = (projectId?: string): string => {
  const baseUploads = path.resolve(process.cwd(), env.UPLOAD_DIR || 'uploads', 'documents');
  const targetDir = projectId ? path.join(baseUploads, projectId) : baseUploads;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const projectId = String(req.params.projectId || 'general');
      const dest = getUploadDir(projectId);
      cb(null, dest);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      const rawBase = path.basename(file.originalname, ext);
      const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const uniqueSuffix = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const finalFileName = `${safeBase}_${uniqueSuffix}${ext}`;
      cb(null, finalFileName);
    } catch (err) {
      cb(err as Error, '');
    }
  },
});

// File filter using validateFileType helper
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const validation = validateFileType(file.originalname, file.mimetype);
  if (!validation.isValid) {
    return cb(ApiError.badRequest(validation.reason || 'Unsupported file format'));
  }
  cb(null, true);
};

// Multer instance
const maxFileSize = (env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024;
const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter,
});

/**
 * Middleware wrapper to safely handle Multer execution, limit violations, and missing files
 */
export const uploadSingleDocument = (req: Request, res: Response, next: NextFunction): void => {
  const singleHandler = upload.single('file');

  singleHandler(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.badRequest(
              `File exceeds the maximum allowable size of ${env.MAX_FILE_SIZE_MB || 25}MB`
            )
          );
        }
        return next(ApiError.badRequest(`File upload error: ${err.message}`));
      }
      return next(err);
    }

    if (!req.file) {
      return next(ApiError.badRequest('No file was uploaded. Please provide a valid file.'));
    }

    next();
  });
};
