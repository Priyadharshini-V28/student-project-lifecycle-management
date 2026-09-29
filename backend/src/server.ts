import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { connectMongo, disconnectMongo } from './db/mongo';

const startServer = async () => {
  // Connect to MongoDB (with in-memory fallback & auto-seeding)
  await connectMongo();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`====================================================`);
    logger.info(`🚀 SPLM Backend Server started successfully`);
    logger.info(`📡 Port:        ${env.PORT}`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Health API:  http://localhost:${env.PORT}/api/health`);
    logger.info(`💻 Client Origin: ${env.CLIENT_URL}`);
    logger.info(`====================================================`);
  });

  const handleShutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Gracefully terminating server...`);
    server.close(async () => {
      await disconnectMongo();
      logger.info('HTTP server and database connections closed. Exiting process.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forceful shutdown timeout reached (10s). Exiting.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start SPLM backend server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection caught:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
