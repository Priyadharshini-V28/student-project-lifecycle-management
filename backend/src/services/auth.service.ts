import bcrypt from 'bcryptjs';
import { query, transaction } from '../db';
import { redisService } from './redis.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { 
  AuthTokens, 
  AuthenticatedUser, 
  JwtPayload 
} from '../types/auth.types';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export class AuthService {
  /**
   * Register a new Student or Faculty account
   */
  async register(input: RegisterInput): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    // 1. Verify email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1', [input.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // 2. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // 3. Atomically create user and role-specific profile
    const createdUser = await transaction(async (client) => {
      // Insert base user
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, department_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role, department_id`,
        [
          input.email.toLowerCase(),
          passwordHash,
          input.firstName,
          input.lastName,
          input.role,
          input.departmentId,
        ]
      );
      const user = userRes.rows[0];

      // Insert role-specific profile
      if (input.role === 'STUDENT') {
        // Verify unique roll number
        const rollCheck = await client.query('SELECT user_id FROM students WHERE roll_number = $1', [input.rollNumber]);
        if (rollCheck.rows.length > 0) {
          throw ApiError.conflict('Roll number is already registered to another student');
        }

        await client.query(
          `INSERT INTO students (user_id, batch_id, roll_number, semester, cgpa)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, input.batchId, input.rollNumber, input.semester, input.cgpa || 0.0]
        );
      } else if (input.role === 'FACULTY') {
        // Verify unique employee ID
        const empCheck = await client.query('SELECT user_id FROM faculty WHERE employee_id = $1', [input.employeeId]);
        if (empCheck.rows.length > 0) {
          throw ApiError.conflict('Employee ID is already registered');
        }

        await client.query(
          `INSERT INTO faculty (user_id, employee_id, designation, specialization)
           VALUES ($1, $2, $3, $4)`,
          [user.id, input.employeeId, input.designation, input.specialization]
        );
      }

      return user;
    });

    // 4. Issue Tokens
    const payload: JwtPayload = {
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      departmentId: createdUser.department_id,
    };

    const accessToken = generateAccessToken(payload);
    const { token: refreshToken, tokenId } = generateRefreshToken(createdUser.id);

    // 5. Store active refresh token in Redis session store
    await redisService.saveRefreshToken(createdUser.id, tokenId);

    // 6. Fetch complete profile
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
    const userRes = await query(
      `SELECT id, email, password_hash, first_name, last_name, role, department_id, is_active
       FROM users WHERE email = $1`,
      [input.email.toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      throw ApiError.forbidden('Your account has been deactivated by the administrator');
    }

    // 2. Validate password hash
    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 3. Issue Tokens
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.department_id,
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
    const userRes = await query(
      'SELECT id, email, role, department_id, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      throw ApiError.unauthorized('User not found or account inactive');
    }

    const user = userRes.rows[0];
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.department_id,
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
    const userRes = await query(
      `SELECT 
        u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName", 
        u.role, u.department_id AS "departmentId",
        d.code AS "departmentCode", d.name AS "departmentName",
        s.roll_number AS "rollNumber", s.semester, s.cgpa, b.name AS "batchName",
        f.employee_id AS "employeeId", f.designation, f.specialization
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN academic_batches b ON s.batch_id = b.id
      LEFT JOIN faculty f ON u.id = f.user_id
      WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw ApiError.notFound('User profile not found');
    }

    const row = userRes.rows[0];

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      departmentId: row.departmentId,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      profile: {
        rollNumber: row.rollNumber,
        semester: row.semester,
        cgpa: row.cgpa ? parseFloat(row.cgpa) : undefined,
        batchName: row.batchName,
        employeeId: row.employeeId,
        designation: row.designation,
        specialization: row.specialization,
      },
    };
  }
}

export const authService = new AuthService();
