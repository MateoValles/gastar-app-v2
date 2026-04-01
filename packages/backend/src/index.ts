// env MUST be imported first — Zod validation runs at import time.
// If any required env var is missing or invalid, the process exits immediately
// with a clear error message before anything else initializes.
import { env } from './config/env.js';
import app from './app.js';

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
