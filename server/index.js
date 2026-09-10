import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initSchema } from './db.js';

// Import routers
import clientsRouter from './routes/clients.js';
import collectionsRouter from './routes/collections.js';
import monthsRouter from './routes/months.js';
import rolloverRouter from './routes/rollover.js';
import reportsRouter from './routes/reports.js';
import excelRouter from './routes/excel.js';
import backupRouter from './routes/backup.js';

import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// High-speed native Gzip Compression Middleware (Shrinks payloads by 75-80% for fast low-network loading)
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') || req.method === 'OPTIONS') return next();

  const originalSend = res.send;
  res.send = function (body) {
    if ((typeof body === 'string' || Buffer.isBuffer(body)) && body.length > 1024) {
      try {
        const buf = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body;
        const compressed = zlib.gzipSync(buf);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Length', compressed.length);
        return originalSend.call(this, compressed);
      } catch (_) {
        return originalSend.call(this, body);
      }
    }
    return originalSend.call(this, body);
  };
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/vite') && !req.path.startsWith('/@')) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Daily Collection Finance API',
    database_mode: process.env.DATABASE_MODE || 'turso',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/clients', clientsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/months', monthsRouter);
app.use('/api/rollover', rolloverRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/excel', excelRouter);
app.use('/api/backup', backupRouter);

// Serve static frontend assets from dist if built
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(distDir, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server
async function startServer() {
  try {
    await initSchema();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Finance Server running on http://localhost:${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
