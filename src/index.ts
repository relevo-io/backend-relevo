import app from './app.js'
import { setupDatabase, seedingDatabase } from './database.js';
import { logger } from './config.js';

async function main() {
  try {
    // CRITICAL: await the database setup before starting the server
    await setupDatabase(); 
    if (process.env.SEED_DATABASE === 'true') {
      await seedingDatabase();
    }
    
    const port = app.get('port');
    app.listen(port, () => {
      logger.info('🚀 Server running on port %d', port);
    });
    
  } catch (error) {
    logger.fatal(error, 'Failed to start application');
    process.exit(1);
  }
}

main();
