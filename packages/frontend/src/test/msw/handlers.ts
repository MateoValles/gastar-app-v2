import { authHandlers } from './handlers/auth.handlers';
import { accountHandlers } from './handlers/accounts.handlers';

export const handlers = [...authHandlers, ...accountHandlers];
