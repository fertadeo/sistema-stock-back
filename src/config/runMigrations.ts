import { DataSource } from 'typeorm';

async function columnaExiste(
  dataSource: DataSource,
  tabla: string,
  columna: string
): Promise<boolean> {
  const resultado = await dataSource.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tabla, columna]
  );

  return Number(resultado[0]?.total || 0) > 0;
}

async function indiceExiste(
  dataSource: DataSource,
  tabla: string,
  indice: string
): Promise<boolean> {
  const resultado = await dataSource.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tabla, indice]
  );

  return Number(resultado[0]?.total || 0) > 0;
}

async function constraintExiste(
  dataSource: DataSource,
  tabla: string,
  constraint: string
): Promise<boolean> {
  const resultado = await dataSource.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    [tabla, constraint]
  );

  return Number(resultado[0]?.total || 0) > 0;
}

export async function runPendingMigrations(dataSource: DataSource): Promise<void> {
  if (!(await columnaExiste(dataSource, 'clientes', 'cliente_vinculado_id'))) {
    console.log('[migrations] Agregando columna clientes.cliente_vinculado_id...');
    await dataSource.query(
      'ALTER TABLE `clientes` ADD COLUMN `cliente_vinculado_id` INT NULL DEFAULT NULL AFTER `dia_reparto`'
    );
  }

  if (!(await indiceExiste(dataSource, 'clientes', 'fk_cliente_vinculado'))) {
    console.log('[migrations] Agregando índice fk_cliente_vinculado...');
    await dataSource.query(
      'ALTER TABLE `clientes` ADD KEY `fk_cliente_vinculado` (`cliente_vinculado_id`)'
    );
  }

  if (!(await constraintExiste(dataSource, 'clientes', 'fk_cliente_vinculado'))) {
    console.log('[migrations] Agregando FK fk_cliente_vinculado...');
    await dataSource.query(
      'ALTER TABLE `clientes` ADD CONSTRAINT `fk_cliente_vinculado` FOREIGN KEY (`cliente_vinculado_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    );
  }

  if (!(await columnaExiste(dataSource, 'user', 'role'))) {
    console.log('[migrations] Agregando columna user.role...');
    await dataSource.query(
      "ALTER TABLE `user` ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER `nivel_usuario`"
    );
    await dataSource.query(
      "UPDATE `user` SET `role` = 'superadmin' WHERE `id` = 1"
    );
  }

  if (!(await columnaExiste(dataSource, 'user', 'repartidor_id'))) {
    console.log('[migrations] Agregando columna user.repartidor_id...');
    await dataSource.query(
      'ALTER TABLE `user` ADD COLUMN `repartidor_id` VARCHAR(36) NULL DEFAULT NULL AFTER `role`'
    );
  }

  console.log('[migrations] Esquema verificado.');
}
