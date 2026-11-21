import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
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

/**
 * Validate incoming request origin against permitted production domains,
 * legitimate Vercel project preview deployments, and local development origins.
 */
export const isOriginAllowed = (
  origin: string | undefined,
  nodeEnv: string = env.NODE_ENV,
  clientUrl: string = env.CLIENT_URL
): boolean => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server health checks)
  if (!origin) return true;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol;

    // 1. Allow localhost/127.0.0.1 in non-production environments
    if (nodeEnv !== 'production') {
      if (
        (protocol === 'http:' || protocol === 'https:') &&
        (hostname === 'localhost' || hostname === '127.0.0.1')
      ) {
        return true;
      }
    }

    // 2. Allow configured CLIENT_URL (supports single or comma-separated origins)
    if (clientUrl) {
      const configuredOrigins = clientUrl
        .split(',')
        .map((u) => {
          try {
            return new URL(u.trim()).origin.toLowerCase();
          } catch {
            return u.trim().toLowerCase();
          }
        })
        .filter(Boolean);

      if (configuredOrigins.includes(parsed.origin.toLowerCase())) {
        return true;
      }
    }

    // Production origins must use HTTPS
    if (protocol !== 'https:') {
      return false;
    }

    // 3. Exact permanent production Vercel domain
    if (hostname === 'student-project-lifecycle-management.vercel.app') {
      return true;
    }

    // 4. Legitimate preview deployments for this exact Vercel project:
    // e.g. student-project-lifecycle-management-88ohimtfm-priya-929e.vercel.app
    // e.g. student-project-lifecycle-management-git-main-priya-929e.vercel.app
    const vercelPreviewRegex = /^student-project-lifecycle-management-[a-z0-9-]+-?[a-z0-9-]*\.vercel\.app$/;
    if (vercelPreviewRegex.test(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const getCorsOptions = (): CorsOptions => ({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 204,
});

export const createApp = (): Application => {
  const app = express();

  // Trust reverse proxy (Render / Cloudflare / Heroku load balancers)
  app.set('trust proxy', 1);

  // Security headers with cross-origin resource policy enabled
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration (executes before all routes)
  const corsMiddleware = cors(getCorsOptions());
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  // Request body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request logger middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Mount API routes (supports both /api/* and root /* for seamless frontend deployment compatibility)
  app.use('/api', healthRoutes);
  app.use('/', healthRoutes);

  app.use('/api', metadataRoutes);
  app.use('/', metadataRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/users', userRoutes);
  app.use('/users', userRoutes);

  app.use('/api/students', studentRoutes);
  app.use('/students', studentRoutes);

  app.use('/api/faculty', facultyRoutes);
  app.use('/faculty', facultyRoutes);

  app.use('/api/proposals', proposalRoutes);
  app.use('/proposals', proposalRoutes);

  app.use('/api/projects', projectRoutes);
  app.use('/projects', projectRoutes);

  app.use('/api/projects', milestoneRoutes);
  app.use('/projects', milestoneRoutes);

  app.use('/api/projects', documentRoutes);
  app.use('/projects', documentRoutes);

  app.use('/api/projects', evaluationRoutes);
  app.use('/projects', evaluationRoutes);

  app.use('/api/allocations', allocationRoutes);
  app.use('/allocations', allocationRoutes);

  app.use('/api/notifications', notificationRoutes);
  app.use('/notifications', notificationRoutes);

  // Fallback for unmatched routes
  app.use(notFoundHandler);

  // Central error handling middleware
  app.use(errorHandler);

  return app;
};
