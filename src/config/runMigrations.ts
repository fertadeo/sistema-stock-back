import { DataSource } from 'typeorm';

async function obtenerNombreBase(dataSource: DataSource): Promise<string> {
  const resultado = await dataSource.query('SELECT DATABASE() AS nombre');
  return String(resultado[0]?.nombre || 'desconocida');
}

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

  const total = resultado[0]?.total;
  return Number(total ?? 0) > 0;
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

  const total = resultado[0]?.total;
  return Number(total ?? 0) > 0;
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

  const total = resultado[0]?.total;
  return Number(total ?? 0) > 0;
}

async function migrarVinculacionClientes(dataSource: DataSource): Promise<void> {
  if (!(await columnaExiste(dataSource, 'clientes', 'cliente_vinculado_id'))) {
    console.log('[migrations] Agregando columna clientes.cliente_vinculado_id...');
    await dataSource.query(
      'ALTER TABLE `clientes` ADD COLUMN `cliente_vinculado_id` INT NULL DEFAULT NULL AFTER `dia_reparto`'
    );
  } else {
    console.log('[migrations] clientes.cliente_vinculado_id ya existe.');
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

  if (!(await columnaExiste(dataSource, 'clientes', 'cliente_vinculado_id'))) {
    throw new Error(
      'No se pudo crear clientes.cliente_vinculado_id. Ejecuta manualmente migrations/alter_clientes_agregar_vinculacion.sql'
    );
  }
}

async function migrarRepartidorAxelAFernando(dataSource: DataSource): Promise<void> {
  const [{ total: clientesPendientes }] = await dataSource.query(
    `SELECT COUNT(*) AS total
     FROM clientes
     WHERE LOWER(TRIM(repartidor)) = 'axel torres'`
  );

  const [{ total: repartidorPendiente }] = await dataSource.query(
    `SELECT COUNT(*) AS total
     FROM repartidores
     WHERE LOWER(TRIM(nombre)) = 'axel torres'`
  );

  const hayClientes = Number(clientesPendientes ?? 0) > 0;
  const hayRepartidor = Number(repartidorPendiente ?? 0) > 0;

  if (!hayClientes && !hayRepartidor) {
    return;
  }

  console.log('[migrations] Renombrando repartidor Axel Torres → Fernando Tadeo...');

  if (hayClientes) {
    const resultado = await dataSource.query(
      `UPDATE clientes
       SET repartidor = 'Fernando Tadeo'
       WHERE LOWER(TRIM(repartidor)) = 'axel torres'`
    );
    const filas = Number(resultado?.affectedRows ?? clientesPendientes ?? 0);
    console.log(`[migrations] Clientes actualizados: ${filas}`);
  }

  if (hayRepartidor) {
    const [{ total: fernandoExiste }] = await dataSource.query(
      `SELECT COUNT(*) AS total
       FROM repartidores
       WHERE LOWER(TRIM(nombre)) = 'fernando tadeo'`
    );

    if (Number(fernandoExiste ?? 0) > 0) {
      console.log(
        '[migrations] Ya existe un repartidor "Fernando Tadeo"; se omitió renombrar el registro de Axel Torres.'
      );
      return;
    }

    await dataSource.query(
      `UPDATE repartidores
       SET nombre = 'Fernando Tadeo'
       WHERE LOWER(TRIM(nombre)) = 'axel torres'`
    );
    console.log('[migrations] Registro en repartidores actualizado.');
  }
}

async function migrarRolesUsuario(dataSource: DataSource): Promise<void> {
  if (!(await columnaExiste(dataSource, 'user', 'role'))) {
    console.log('[migrations] Agregando columna user.role...');
    await dataSource.query(
      "ALTER TABLE `user` ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'admin'"
    );
    await dataSource.query("UPDATE `user` SET `role` = 'superadmin' WHERE `id` = 1");
  } else {
    console.log('[migrations] user.role ya existe.');
  }

  if (!(await columnaExiste(dataSource, 'user', 'repartidor_id'))) {
    console.log('[migrations] Agregando columna user.repartidor_id...');
    await dataSource.query(
      'ALTER TABLE `user` ADD COLUMN `repartidor_id` VARCHAR(36) NULL DEFAULT NULL'
    );
  } else {
    console.log('[migrations] user.repartidor_id ya existe.');
  }
}

export async function runPendingMigrations(dataSource: DataSource): Promise<void> {
  const base = await obtenerNombreBase(dataSource);
  console.log(`[migrations] Verificando esquema en base de datos: ${base}`);

  await migrarVinculacionClientes(dataSource);
  await migrarRolesUsuario(dataSource);
  await migrarRepartidorAxelAFernando(dataSource);

  console.log('[migrations] Esquema verificado correctamente.');
}
