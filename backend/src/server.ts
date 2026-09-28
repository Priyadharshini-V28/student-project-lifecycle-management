import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

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

const handleShutdown = (signal: string) => {
  logger.warn(`Received ${signal}. Gracefully terminating server...`);
  server.close(() => {
    logger.info('HTTP server closed successfully. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown timeout reached (10s). Exiting.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection caught:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
