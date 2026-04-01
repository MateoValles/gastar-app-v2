import { authHandlers } from './handlers/auth.handlers';
import { accountHandlers } from './handlers/accounts.handlers';
import { categoryHandlers } from './handlers/categories.handlers';
import { transactionHandlers } from './handlers/transactions.handlers';
import { dashboardHandlers } from './handlers/dashboard.handlers';

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...categoryHandlers,
  ...transactionHandlers,
  ...dashboardHandlers,
];
