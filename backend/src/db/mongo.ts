import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { seedMongoData } from './seed_mongo';
import { User } from '../models';

let memReplSet: MongoMemoryReplSet | null = null;
let isConnected = false;
let supportsTransactions = false;

/**
 * Connect to external MongoDB or fallback to MongoMemoryReplSet
 */
export const connectMongo = async (): Promise<typeof mongoose> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 1. Try external MongoDB
  try {
    logger.info(`Connecting to external MongoDB at ${env.MONGODB_URI}...`);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    logger.info('Connected to live external MongoDB database.');

    // Check if external deployment supports transactions (Replica Set or mongos)
    try {
      const helloResult = await mongoose.connection.db?.admin().command({ hello: 1 });
      supportsTransactions = Boolean(helloResult?.setName || helloResult?.msg === 'isdbgrid');
      logger.info(`External MongoDB transaction support: ${supportsTransactions ? 'ENABLED (ReplSet)' : 'STANDALONE (Running in direct mode)'}`);
    } catch {
      supportsTransactions = false;
    }

    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      logger.info('External MongoDB is empty. Seeding initial academic dataset...');
      await seedMongoData();
    }

    return mongoose;
  } catch (err: any) {
    logger.warn(`⚠️ External MongoDB not reachable (${err?.message || err}). Initializing In-Memory MongoDB Engine (ReplSet with Transaction Support)...`);
  }

  // 2. Fallback to In-Memory MongoDB ReplSet
  if (!memReplSet) {
    memReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
  }

  const memUri = memReplSet.getUri();
  await mongoose.connect(memUri);
  isConnected = true;
  supportsTransactions = true;
  logger.info(`✅ In-Memory MongoDB initialized successfully at ${memUri}`);

  // Seed academic data
  await seedMongoData();

  return mongoose;
};

/**
 * Disconnect from MongoDB and stop in-memory server if running
 */
export const disconnectMongo = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memReplSet) {
    await memReplSet.stop();
    memReplSet = null;
  }
  isConnected = false;
  supportsTransactions = false;
  logger.info('MongoDB disconnected.');
};

/**
 * Resilient Transaction Runner with Session Support
 */
export const withMongoTransaction = async <T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  await connectMongo();

  if (!supportsTransactions) {
    // Execute directly without transaction session on standalone MongoDB deployments
    return await callback(undefined as any);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export default mongoose;
