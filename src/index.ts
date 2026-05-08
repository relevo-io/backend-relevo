import { createServer } from 'http';
import app from './app.js'
import { setupDatabase, seedingDatabase } from './database.js';
import { logger } from './config.js';
import { initSocketServer } from './sockets/socketServer.js';

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('Missing required env var: MONGO_URI');
    }
    if (!process.env.FRONTEND_URL) {
      throw new Error('Missing required env var: FRONTEND_URL');
    }

    // CRITICAL: await the database setup before starting the server
    await setupDatabase(); 
    if (process.env.SEED_DATABASE === 'true') {
      await seedingDatabase();
    }
    
    const port = app.get('port');

    // Create http.Server so Socket.io can attach to the same instance
    const httpServer = createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(port, () => {
      logger.info('🚀 Server running on port %d', port);
      logger.info('⚡ Socket.io ready');
    });
    
  } catch (error) {
    logger.fatal(error, 'Failed to start application');
    process.exit(1);
  }
}

main();
