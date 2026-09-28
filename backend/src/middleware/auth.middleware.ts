import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types/auth.types';

/**
 * Authentication Middleware: Validates Bearer JWT Access Token
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required: Missing or malformed Bearer token');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw ApiError.unauthorized('Authentication required: Missing token');
  }

  // Verifies signature & expiration; throws ApiError if invalid
  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
};

/**
 * Role-Based Access Control (RBAC) Middleware: Restricts route to specified roles
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied: Your role (${req.user.role}) is not authorized to access this resource`
      );
    }

    next();
  };
};
