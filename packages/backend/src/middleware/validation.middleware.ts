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

/**
 * Factory that returns an Express middleware which validates `req.query`
 * against the provided Zod schema.
 *
 * On success: replaces `req.query` with the parsed (typed, coerced, defaulted)
 * data and calls `next()`.
 *
 * On failure: throws `ValidationError` with field-level details derived
 * from Zod's issue list. The error propagates to the global error middleware.
 *
 * Use `z.coerce.number()` in the schema for numeric query params — query
 * strings always arrive as strings from Express.
 *
 * @example
 * router.get('/', validateQuery(listTransactionsQuerySchema), controller.list);
 */
export function validateQuery(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      throw new ValidationError('Invalid query parameters', result.error.issues);
    }

    // Shadow the `query` getter on this specific request instance.
    // Express 5 / Node IncomingMessage defines `query` as a prototype-level
    // getter that re-parses the query string on every access — mutating the
    // returned object (Object.assign / delete) has no effect because the next
    // access returns a freshly parsed object again.
    // By defining an own property on `req`, we override the prototype getter
    // for the lifetime of this request, so every subsequent `req.query` access
    // returns the Zod-parsed (coerced, defaulted, stripped) data.
    const parsedData = result.data as Record<string, unknown>;
    Object.defineProperty(req, 'query', {
      value: parsedData,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
