import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { seedMongoData } from './seed_mongo';
import { User } from '../models';

let isConnected = false;
let supportsTransactions = false;

export const connectMongo = async (): Promise<typeof mongoose> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;
    logger.info('Connected to MongoDB successfully.');

    try {
      const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
      supportsTransactions = Boolean(hello?.setName || hello?.msg === 'isdbgrid');
    } catch {
      supportsTransactions = false;
    }

    if (await User.countDocuments() === 0) {
      logger.info('Database is empty. Seeding initial data...');
      await seedMongoData();
    }

    return mongoose;
  } catch (error) {
    isConnected = false;

    if (env.NODE_ENV === 'production') {
      logger.error('MongoDB connection failed in production:', error);
      throw error;
    }

    logger.warn('External MongoDB unavailable. Trying in-memory MongoDB...');

    const { MongoMemoryReplSet } = await import('mongodb-memory-server');

    const memoryServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    await mongoose.connect(memoryServer.getUri());
    isConnected = true;
    supportsTransactions = true;

    logger.info('In-memory MongoDB initialized.');
    await seedMongoData();

    return mongoose;
  }
};

export const disconnectMongo = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  isConnected = false;
  supportsTransactions = false;
  logger.info('MongoDB disconnected.');
};

export const withMongoTransaction = async <T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  await connectMongo();

  if (!supportsTransactions) {
    return callback(undefined as any);
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
