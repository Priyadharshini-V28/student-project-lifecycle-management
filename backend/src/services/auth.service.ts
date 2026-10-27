import bcrypt from 'bcryptjs';
import { User, Department, AcademicBatch } from '../models';
import { withMongoTransaction } from '../db/mongo';
import { redisService } from './redis.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import {
  AuthTokens,
  AuthenticatedUser,
  JwtPayload,
} from '../types/auth.types';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export class AuthService {
  /**
   * Register a new Student or Faculty account
   */
  async register(input: RegisterInput): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    // 0. Strict Admin Registration Guard: Admin cannot be registered via public endpoint
    if ((input.role as string) === 'ADMIN') {
      throw ApiError.forbidden('Administrator accounts cannot be registered through public registration.');
    }

    // 1. Verify email uniqueness
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // 2. Validate role-specific unique identifiers
    if (input.role === 'STUDENT' && input.rollNumber) {
      const rollCheck = await User.findOne({ 'studentProfile.rollNumber': input.rollNumber });
      if (rollCheck) {
        throw ApiError.conflict('Roll number is already registered to another student');
      }
    } else if (input.role === 'FACULTY' && input.employeeId) {
      const empCheck = await User.findOne({ 'facultyProfile.employeeId': input.employeeId });
      if (empCheck) {
        throw ApiError.conflict('Employee ID is already registered');
      }
    }

    // 3. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // 4. Atomically create user with embedded role-specific profile
    const createdUser = await withMongoTransaction(async (session) => {
      const userDoc = new User({
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        departmentId: input.departmentId,
        isActive: true,
        ...(input.role === 'STUDENT'
          ? {
              studentProfile: {
                batchId: input.batchId,
                rollNumber: input.rollNumber,
                semester: input.semester,
                cgpa: input.cgpa || 0.0,
              },
            }
          : {}),
        ...(input.role === 'FACULTY'
          ? {
              facultyProfile: {
                employeeId: input.employeeId,
                designation: input.designation,
                specialization: input.specialization,
                maxProjects: 5,
              },
            }
          : {}),
      });

      await userDoc.save({ session });
      return userDoc;
    });

    // 5. Issue Tokens
    const payload: JwtPayload = {
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      departmentId: createdUser.departmentId,
    };

    const accessToken = generateAccessToken(payload);
    const { token: refreshToken, tokenId } = generateRefreshToken(createdUser.id);

    // 6. Store active refresh token in Redis session store
    await redisService.saveRefreshToken(createdUser.id, tokenId);

    // 7. Fetch complete profile
    const profile = await this.getCurrentUser(createdUser.id);

    logger.info(`User registered successfully: ${createdUser.email} (${createdUser.role})`);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '15m',
      },
      user: profile,
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(input: LoginInput): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    // 1. Fetch user credentials
    const user = await User.findOne({ email: input.email.toLowerCase() });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated by the administrator');
    }

    // 2. Validate password hash
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 3. Issue Tokens
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const accessToken = generateAccessToken(payload);
    const { token: refreshToken, tokenId } = generateRefreshToken(user.id);

    // 4. Save active token in Redis session store
    await redisService.saveRefreshToken(user.id, tokenId);

    // 5. Fetch complete user profile
    const profile = await this.getCurrentUser(user.id);

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '15m',
      },
      user: profile,
    };
  }

  /**
   * Rotate Refresh Token & Issue new Access Token
   */
  async refreshToken(oldRefreshToken: string): Promise<AuthTokens> {
    // 1. Verify token signature
    const { userId, tokenId } = verifyRefreshToken(oldRefreshToken);

    // 2. Check existence in Redis Authoritative Session Store
    const isValidInRedis = await redisService.verifyRefreshToken(userId, tokenId);
    if (!isValidInRedis) {
      throw ApiError.unauthorized('Session revoked or expired. Please login again.');
    }

    // 3. Atomic Token Rotation: Delete old token, issue new token pair
    await redisService.revokeRefreshToken(userId, tokenId);

    // Fetch user for current role and permissions
    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or account inactive');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const newAccessToken = generateAccessToken(payload);
    const { token: newRefreshToken, tokenId: newTokenId } = generateRefreshToken(user.id);

    // Save new active token in Redis
    await redisService.saveRefreshToken(user.id, newTokenId);

    logger.debug(`Token rotated successfully for user: ${userId}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '15m',
    };
  }

  /**
   * Logout user: Invalidate session in Redis
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    try {
      const { userId, tokenId } = verifyRefreshToken(refreshToken);
      await redisService.revokeRefreshToken(userId, tokenId);
      logger.info(`User session logged out and revoked: ${userId}`);
    } catch {
      // If token expired already, no action required
    }
  }

  /**
   * Retrieve full user profile
   */
  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User profile not found');
    }

    // Look up department and batch
    const dept = user.departmentId ? await Department.findById(user.departmentId) : null;
    let batchName: string | undefined;

    if (user.role === 'STUDENT' && user.studentProfile?.batchId) {
      const batch = await AcademicBatch.findById(user.studentProfile.batchId);
      batchName = batch?.name;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId,
      departmentCode: dept?.code || 'AIDS',
      departmentName: dept?.name || 'Department of Artificial Intelligence & Data Science',
      profile: {
        rollNumber: user.studentProfile?.rollNumber,
        semester: user.studentProfile?.semester,
        cgpa: user.studentProfile?.cgpa !== undefined ? Number(user.studentProfile.cgpa) : undefined,
        batchName: batchName || 'Unassigned Batch',
        employeeId: user.facultyProfile?.employeeId,
        designation: user.facultyProfile?.designation,
        specialization: user.facultyProfile?.specialization,
      },
    };
  }
}

export const authService = new AuthService();
