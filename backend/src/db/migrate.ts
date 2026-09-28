import fs from 'fs';
import path from 'path';
import { pool } from './index';
import { logger } from '../utils/logger';

export const runMigrations = async (): Promise<void> => {
  logger.info('====================================================');
  logger.info('📦 Running Database Migrations...');
  logger.info('====================================================');

  const migrationFile = path.resolve(__dirname, 'migrations/001_create_tables.sql');

  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found at: ${migrationFile}`);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');

  const client = await pool.connect();
  try {
    logger.info('Executing DDL: 001_create_tables.sql');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    logger.info('✅ All 17 tables, constraints, and indexes migrated successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Execute directly if run via CLI
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Fatal migration error:', err);
      await pool.end();
      process.exit(1);
    });
}
