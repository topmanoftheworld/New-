import express from 'express';
import cors from 'cors';
import aiAssistantRouter from './aiAssistantRoute.js';

const PORT = process.env.PORT || 3001;

const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-AI-Provider'],
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use('/api', aiAssistantRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`AI assistant server listening on http://localhost:${PORT}`);
});
