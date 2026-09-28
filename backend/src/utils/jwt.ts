import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { JwtPayload, RefreshTokenPayload } from '../types/auth.types';
import { ApiError } from './ApiError';

export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const generateRefreshToken = (
  userId: string
): { token: string; tokenId: string } => {
  const tokenId = crypto.randomUUID();
  const payload: RefreshTokenPayload = { userId, tokenId };
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  return { token, tokenId };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Access token has expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Refresh token has expired. Please login again.');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }
};
