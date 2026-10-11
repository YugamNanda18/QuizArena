import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { connectDB } from './config/db';
import { initSocketIO } from './socket/socketHandler';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { seedDatabase } from './utils/seed';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocketIO(server);

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'healthy',
    product: 'QuizArena Enterprise',
    timestamp: new Date().toISOString(),
  });
});


// Mount versioned API routes
app.use('/api/v1', apiRoutes);

// Centralized error handler
app.use(errorHandler);

// Start Server
async function start() {
  await connectDB();
  await seedDatabase();

  server.listen(config.PORT, () => {
    console.log(`[Server] QuizArena Enterprise running on port ${config.PORT}`);
    console.log(`[Server] Environment: ${config.NODE_ENV}`);
  });
}

// Only listen if not imported by test runners
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, server };
