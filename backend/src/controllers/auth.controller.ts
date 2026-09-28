import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedInput = registerSchema.parse(req.body);
    const { tokens, user } = await authService.register(validatedInput);

    // Set refresh token in secure HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedInput = loginSchema.parse(req.body);
    const { tokens, user } = await authService.login(validatedInput);

    // Set refresh token in secure HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      res.status(401).json({
        success: false,
        message: 'No refresh token provided in cookie',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const newTokens = await authService.refreshToken(oldRefreshToken);

    // Update cookie with rotated token
    res.cookie('refreshToken', newTokens.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    await authService.logout(currentRefreshToken);

    // Clear refresh cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Current user profile retrieved',
      data: { user },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
