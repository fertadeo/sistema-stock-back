import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { runPendingMigrations } from '../config/runMigrations';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  await runPendingMigrations(AppDataSource);
  await AppDataSource.destroy();
  console.log('[migrate] Listo.');
}

main().catch((error) => {
  console.error('[migrate] Error:', error);
  process.exit(1);
});
