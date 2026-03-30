import type { ZodIssue } from 'zod';

/**
 * Abstract base class for all application errors.
 * Services throw AppError subclasses; controllers never catch them.
 * The global error middleware handles all AppError instances.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly isOperational: boolean = true;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (required when extending built-in classes in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 400 — Invalid request body or parameters.
 * Attach Zod issue details when throwing from the validation middleware.
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly details: Array<{ field: string; message: string }>;

  constructor(
    message: string = 'Validation failed',
    issues: ZodIssue[] = [],
  ) {
    super(message);
    this.details = issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }
}

/**
 * 401 — Missing or invalid authentication credentials.
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  // Typed as string (not literal) so subclasses can override with a different code
  readonly code: string = 'UNAUTHORIZED';

  constructor(message: string = 'Authentication required') {
    super(message);
  }
}

/**
 * 403 — Authenticated but not permitted to access the resource.
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

/**
 * 404 — Requested resource does not exist.
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

/**
 * 409 — Resource conflict (e.g. duplicate email, unique constraint).
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';

  constructor(message: string = 'Resource already exists') {
    super(message);
  }
}

/**
 * 500 — Unexpected server-side error.
 * Mark isOperational = false so the error middleware logs the full stack.
 */
export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_ERROR';
  override readonly isOperational: boolean = false;

  constructor(message: string = 'An unexpected error occurred') {
    super(message);
  }
}
