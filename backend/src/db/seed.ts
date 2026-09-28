import fs from 'fs';
import path from 'path';
import { pool } from './index';
import { logger } from '../utils/logger';

export const runSeed = async (): Promise<void> => {
  logger.info('====================================================');
  logger.info('🌱 Seeding Realistic Academic Data...');
  logger.info('====================================================');

  const seedFile = path.resolve(__dirname, 'migrations/002_seed_data.sql');

  if (!fs.existsSync(seedFile)) {
    throw new Error(`Seed file not found at: ${seedFile}`);
  }

  const sql = fs.readFileSync(seedFile, 'utf-8');

  const client = await pool.connect();
  try {
    logger.info('Executing Seed DML: 002_seed_data.sql');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    logger.info('✅ Realistic seed data inserted successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('❌ Database seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Execute directly if run via CLI
if (require.main === module) {
  runSeed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Fatal seed error:', err);
      await pool.end();
      process.exit(1);
    });
}
