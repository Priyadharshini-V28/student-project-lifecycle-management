import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;

  res.status(isMongoReady ? 200 : 503).json({
    success: isMongoReady,
    message: isMongoReady
      ? 'Student Project Lifecycle Management Platform API is healthy'
      : 'Service degraded: Database connection unavailable',
    data: {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: isMongoReady ? 'CONNECTED' : 'DISCONNECTED',
        databaseEngine: 'MongoDB/Mongoose',
        sessionStore: 'Redis / In-Memory TTL Session Store',
      },
    },
  });
});

export default router;
