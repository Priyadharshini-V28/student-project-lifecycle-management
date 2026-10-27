import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import studentRoutes from './routes/student.routes';
import facultyRoutes from './routes/faculty.routes';
import proposalRoutes from './routes/proposal.routes';
import projectRoutes from './routes/project.routes';
import milestoneRoutes from './routes/milestone.routes';
import allocationRoutes from './routes/allocation.routes';
import metadataRoutes from './routes/metadata.routes';
import documentRoutes from './routes/document.routes';
import notificationRoutes from './routes/notification.routes';
import evaluationRoutes from './routes/evaluation.routes';

export const createApp = (): Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Request body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request logger middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Mount API routes
  app.use('/api', healthRoutes);
  app.use('/api', metadataRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/faculty', facultyRoutes);
  app.use('/api/proposals', proposalRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/projects', milestoneRoutes);
  app.use('/api/projects', documentRoutes);
  app.use('/api/projects', evaluationRoutes);
  app.use('/api/allocations', allocationRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Fallback for unmatched routes
  app.use(notFoundHandler);

  // Central error handling middleware
  app.use(errorHandler);

  return app;
};
