export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  departmentId?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId?: number;
  departmentCode?: string;
  departmentName?: string;
  profile?: {
    rollNumber?: string;
    semester?: number;
    cgpa?: number;
    batchName?: string;
    employeeId?: string;
    designation?: string;
    specialization?: string;
  };
}

// Augment Express Request type with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
