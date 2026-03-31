export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
