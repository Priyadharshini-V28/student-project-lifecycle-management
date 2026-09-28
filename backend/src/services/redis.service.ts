import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryStore = new Map<string, MemoryCacheEntry>();

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.client = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // Do not spam reconnection loops if offline
        lazyConnect: true,
      });

      this.client.connect()
        .then(() => {
          this.isConnected = true;
          logger.info('⚡ Connected to external Redis instance.');
        })
        .catch(() => {
          this.isConnected = false;
          logger.warn('⚠️ External Redis on 6379 not reachable. Operating with in-memory TTL session store.');
        });

      this.client.on('error', () => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
      logger.warn('Operating with in-memory TTL session store.');
    }
  }

  /**
   * Set a key with Time-To-Live (TTL) in seconds
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    // In-memory fallback with TTL
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Retrieve a key value if not expired
   */
  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      return this.client.get(key);
    }

    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a key (O(1) revocation)
   */
  async del(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      return this.client.del(key);
    }

    const existed = this.memoryStore.has(key);
    this.memoryStore.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Check if key exists and is valid
   */
  async exists(key: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      const res = await this.client.exists(key);
      return res === 1;
    }

    const val = await this.get(key);
    return val !== null;
  }

  // --------------------------------------------------------------------------
  // Domain Session Operations: The Authoritative Active Refresh Token Store
  // --------------------------------------------------------------------------
  private getRefreshTokenKey(userId: string, tokenId: string): string {
    return `refresh_token:${userId}:${tokenId}`;
  }

  async saveRefreshToken(userId: string, tokenId: string, ttlSeconds = 7 * 24 * 60 * 60): Promise<void> {
    const key = this.getRefreshTokenKey(userId, tokenId);
    await this.set(key, 'active', ttlSeconds);
    logger.debug(`Saved active refresh token in Redis store: ${key}`);
  }

  async verifyRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const key = this.getRefreshTokenKey(userId, tokenId);
    return this.exists(key);
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const key = this.getRefreshTokenKey(userId, tokenId);
    const count = await this.del(key);
    logger.info(`Revoked refresh token from session store: ${key}`);
    return count > 0;
  }
}

export const redisService = new RedisService();
