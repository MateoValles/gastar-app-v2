// Module augmentation — extends Express's Request interface
// to carry the authenticated user's ID after auth.middleware runs.
declare module 'express' {
  interface Request {
    userId?: string;
  }
}

export {};
