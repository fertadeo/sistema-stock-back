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

async function migrarPisoDepartamentoClientes(dataSource: DataSource): Promise<void> {
  if (!(await columnaExiste(dataSource, 'clientes', 'piso'))) {
    console.log('[migrations] Agregando columna clientes.piso...');
    await dataSource.query(
      'ALTER TABLE `clientes` ADD COLUMN `piso` VARCHAR(50) NULL DEFAULT NULL AFTER `direccion`'
    );
  } else {
    console.log('[migrations] clientes.piso ya existe.');
  }

  if (!(await columnaExiste(dataSource, 'clientes', 'departamento'))) {
    console.log('[migrations] Agregando columna clientes.departamento...');
    await dataSource.query(
      'ALTER TABLE `clientes` ADD COLUMN `departamento` VARCHAR(50) NULL DEFAULT NULL AFTER `piso`'
    );
  } else {
    console.log('[migrations] clientes.departamento ya existe.');
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

async function tablaExiste(dataSource: DataSource, tabla: string): Promise<boolean> {
  const resultado = await dataSource.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tabla]
  );

  const total = resultado[0]?.total;
  return Number(total ?? 0) > 0;
}

async function migrarRepartidorUbicaciones(dataSource: DataSource): Promise<void> {
  if (await tablaExiste(dataSource, 'repartidor_ubicaciones')) {
    console.log('[migrations] repartidor_ubicaciones ya existe.');
    return;
  }

  console.log('[migrations] Creando tabla repartidor_ubicaciones...');
  await dataSource.query(`
    CREATE TABLE \`repartidor_ubicaciones\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`repartidor_id\` INT NOT NULL,
      \`repartidor_nombre\` VARCHAR(100) NOT NULL,
      \`latitud\` DECIMAL(10, 8) NOT NULL,
      \`longitud\` DECIMAL(11, 8) NOT NULL,
      \`actualizado_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_repartidor_ubicacion\` (\`repartidor_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
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

async function migrarRepartidorRuta(dataSource: DataSource): Promise<void> {
  if (!(await tablaExiste(dataSource, 'repartidor_ruta_paradas'))) {
    console.log('[migrations] Creando tabla repartidor_ruta_paradas...');
    await dataSource.query(`
      CREATE TABLE \`repartidor_ruta_paradas\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`cliente_id\` INT NOT NULL,
        \`comentario\` TEXT NULL,
        \`hora_alerta\` TIME NULL,
        \`fecha\` DATE NOT NULL,
        \`alerta_enviada\` TINYINT(1) NOT NULL DEFAULT 0,
        \`visitado\` TINYINT(1) NOT NULL DEFAULT 0,
        \`orden\` INT NOT NULL DEFAULT 0,
        \`creado_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_ruta_user_fecha\` (\`user_id\`, \`fecha\`),
        KEY \`idx_ruta_alerta\` (\`fecha\`, \`hora_alerta\`, \`alerta_enviada\`),
        CONSTRAINT \`fk_ruta_cliente\` FOREIGN KEY (\`cliente_id\`) REFERENCES \`clientes\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } else {
    console.log('[migrations] repartidor_ruta_paradas ya existe.');
  }

  if (!(await tablaExiste(dataSource, 'push_subscriptions'))) {
    console.log('[migrations] Creando tabla push_subscriptions...');
    await dataSource.query(`
      CREATE TABLE \`push_subscriptions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`endpoint\` VARCHAR(500) NOT NULL,
        \`p256dh\` VARCHAR(255) NOT NULL,
        \`auth\` VARCHAR(255) NOT NULL,
        \`creado_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_push_endpoint\` (\`endpoint\`(255)),
        KEY \`idx_push_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } else {
    console.log('[migrations] push_subscriptions ya existe.');
  }
}

export async function runPendingMigrations(dataSource: DataSource): Promise<void> {
  const base = await obtenerNombreBase(dataSource);
  console.log(`[migrations] Verificando esquema en base de datos: ${base}`);

  await migrarVinculacionClientes(dataSource);
  await migrarPisoDepartamentoClientes(dataSource);
  await migrarRepartidorUbicaciones(dataSource);
  await migrarRolesUsuario(dataSource);
  await migrarRepartidorRuta(dataSource);
  await migrarRepartidorAxelAFernando(dataSource);

  console.log('[migrations] Esquema verificado correctamente.');
}
