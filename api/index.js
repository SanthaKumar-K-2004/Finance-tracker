import app from '../server/app.js';
import { initSchema } from '../server/db.js';

let isInitialized = false;

export default async function handler(req, res) {
  if (!isInitialized) {
    try {
      await initSchema();
    } catch (err) {
      console.error('Failed to initialize database schema on cold start:', err);
    }
    isInitialized = true;
  }
  return app(req, res);
}
