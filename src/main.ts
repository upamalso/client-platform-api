import { createApp } from './bootstrap';
import { loadConfig } from './config';
import { DatabaseService } from './database/database.service';

async function start(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);
  try {
    await app.get(DatabaseService).ready();
    await app.listen(config.port, config.apiHost);
    console.log(`Client platform API listening on ${config.apiHost}:${config.port}/api/v1`);
  } catch (error) {
    await app.close();
    throw error;
  }
}

start().catch(() => {
  console.error('API startup failed. Check environment, database access and migrations.');
  process.exitCode = 1;
});