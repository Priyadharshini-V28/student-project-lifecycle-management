import { connectMongo, disconnectMongo } from './mongo';
import * as models from '../models';
import { logger } from '../utils/logger';

export const runMigrations = async (): Promise<void> => {
  logger.info('====================================================');
  logger.info('📦 Synchronizing MongoDB Collections & Indexes...');
  logger.info('====================================================');

  await connectMongo();

  for (const modelName of Object.keys(models)) {
    const m = (models as Record<string, any>)[modelName];
    if (m && typeof m.init === 'function') {
      await m.init();
      logger.info(`✓ Synchronized index for ${modelName}`);
    }
  }

  logger.info('✅ All MongoDB collections, constraints, and indexes synchronized.');
  await disconnectMongo();
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Fatal migration error:', err);
      process.exit(1);
    });
}
