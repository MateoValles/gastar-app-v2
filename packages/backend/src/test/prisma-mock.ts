import { vi } from 'vitest';

/**
 * Deep-mock helper for Prisma Client.
 *
 * Creates a mock object that returns `vi.fn()` for any nested property access.
 * This means `prisma.account.findMany`, `prisma.transaction.groupBy`, and
 * `prisma.$transaction(...)` all work out of the box without explicit setup.
 *
 * Usage in a test file:
 *
 * ```ts
 * import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';
 *
 * vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));
 *
 * const mockPrisma = getMockPrisma();
 * mockPrisma.account.findMany.mockResolvedValue([...]);
 * ```
 *
 * Important: `createMockPrisma()` must be called inside `vi.mock()` factory
 * because vi.mock is hoisted. The `getMockPrisma()` reference lets you
 * configure return values in your tests after the mock is set up.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = ReturnType<typeof vi.fn<(...args: any[]) => any>>;

/** A mock Prisma model — any property access returns a vi.fn(). */
type MockModel = { [method: string]: MockFn };

/** Top-level mock Prisma client — any property returns a MockModel or a MockFn. */
export type MockPrismaClient = {
  [model: string]: MockModel;
} & { $transaction: MockFn };

// Singleton reference — initialized when createMockPrisma() is first called.
let _instance: MockPrismaClient;

export function createMockPrisma(): MockPrismaClient {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      // $transaction is a top-level method, not a model.
      // Default implementation supports both Prisma overloads:
      // - Callback form: prisma.$transaction(async (tx) => { ... })
      // - Array form: prisma.$transaction([promise1, promise2, ...])
      if (prop === '$transaction') {
        if (!target[prop]) {
          target[prop] = vi.fn((arg: unknown, ...rest: unknown[]) => {
            if (typeof arg === 'function') {
              return (arg as (tx: MockPrismaClient, ...args: unknown[]) => unknown)(
                _instance,
                ...rest,
              );
            }
            if (Array.isArray(arg)) {
              return Promise.all(arg as unknown[]);
            }
            return Promise.resolve(arg);
          });
        }
        return target[prop];
      }

      // For model names (account, transaction, etc.), return a nested proxy
      if (!target[prop]) {
        target[prop] = new Proxy(Object.create(null) as Record<string, unknown>, {
          get(modelTarget, method: string) {
            if (!modelTarget[method]) {
              modelTarget[method] = vi.fn();
            }
            return modelTarget[method];
          },
        });
      }
      return target[prop];
    },
  };

  _instance = new Proxy(
    Object.create(null) as Record<string, unknown>,
    handler,
  ) as unknown as MockPrismaClient;
  return _instance;
}

/**
 * Get the current mock Prisma instance.
 * Call this in your test files to configure mock return values.
 *
 * Must be called AFTER `vi.mock('@/lib/prisma.js', ...)` has been set up.
 */
export function getMockPrisma(): MockPrismaClient {
  if (!_instance) {
    throw new Error('Mock Prisma not initialized. Call createMockPrisma() inside vi.mock() first.');
  }
  return _instance;
}
