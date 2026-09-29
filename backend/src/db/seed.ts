import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { logger } from '../utils/logger';

export const runSeed = async (): Promise<void> => {
  logger.info('====================================================');
  logger.info('🌱 Running MongoDB Academic Dataset Seeding...');
  logger.info('====================================================');

  await connectMongo();
  await seedMongoData();
  await disconnectMongo();
};

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Fatal seed error:', err);
      process.exit(1);
    });
}
