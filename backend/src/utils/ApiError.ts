export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: unknown[];

  constructor(statusCode: number, message: string, isOperational = true, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: unknown[]) {
    return new ApiError(400, message, true, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, true);
  }

  static forbidden(message = 'Access forbidden: Insufficient permissions') {
    return new ApiError(403, message, true);
  }

  static notFound(message = 'Requested resource was not found') {
    return new ApiError(404, message, true);
  }

  static conflict(message: string) {
    return new ApiError(409, message, true);
  }

  static unprocessable(message: string, errors?: unknown[]) {
    return new ApiError(422, message, true, errors);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }
}
