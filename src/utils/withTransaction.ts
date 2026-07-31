import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../config/database';

/**
 * Ejecuta trabajo en una transacción y SIEMPRE libera el QueryRunner antes de
 * devolver el control. Evita deadlocks de pool (runner retiene la conexión y
 * luego se pide otra al mismo pool con DB_POOL_SIZE bajo).
 */
export async function withTransaction<T>(
  work: (manager: QueryRunner['manager']) => Promise<T>
): Promise<T> {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const result = await work(queryRunner.manager);

    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw error;
  } finally {
    await queryRunner.release();
  }
}
