import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@/lib/errors.js';

/**
 * Factory that returns an Express middleware which validates `req.body`
 * against the provided Zod schema.
 *
 * On success: replaces `req.body` with the parsed (typed, stripped) data
 * and calls `next()`.
 *
 * On failure: throws `ValidationError` with field-level details derived
 * from Zod's issue list. The error propagates to the global error middleware.
 *
 * @example
 * router.post('/register', validate(registerSchema), controller.register);
 */
export function validate(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.issues);
    }

    // Replace req.body with the clean, parsed output (strips unknown fields,
    // applies defaults, transforms — whatever the schema defines).
    req.body = result.data;
    next();
  };
}
