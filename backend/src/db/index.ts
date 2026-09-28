import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Instantiate PostgreSQL connection pool
export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle PostgreSQL client pool', err);
});

/**
 * Execute a parameterized SQL query with automatic timing and safety
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 150) {
      logger.warn(`Slow SQL Query (${duration}ms): ${text.trim().substring(0, 100)}...`);
    } else {
      logger.debug(`SQL Executed (${duration}ms): ${text.trim().substring(0, 80)}...`);
    }
    return res;
  } catch (error) {
    logger.error(`Database query failed: ${text}`, error);
    throw error;
  }
};

/**
 * Execute multiple database operations atomically inside a transaction block
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back due to error:', err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Check connectivity to the database
 */
export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT 1 AS connected, NOW() AS server_time');
    return res.rows.length > 0 && res.rows[0].connected === 1;
  } catch (err) {
    logger.error('PostgreSQL connection check failed:', err);
    return false;
  }
};
