import express from 'express';

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

export default app;
