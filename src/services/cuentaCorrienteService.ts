import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Cobro } from '../entities/Cobro';
import { Venta } from '../entities/Venta';
import { MovimientoService } from './movimientoService';

type MedioPago = 'efectivo' | 'transferencia' | 'debito' | 'credito';

interface ClienteCuentaBase {
  id: number;
  nombre: string;
  telefono: string;
  direccion: string;
  estado: boolean;
  zona: number | null;
  repartidor: string;
  dia_reparto: string;
}

interface MovimientoCuentaCorriente {
  id: string;
  fecha: string;
  tipo: 'DEBITO_VENTA' | 'CREDITO_COBRO';
  origen: 'VENTA' | 'COBRO';
  referencia_id: string;
  descripcion: string;
  debito: number;
  credito: number;
  saldo_acumulado: number;
  medio_pago: MedioPago | null;
  observaciones: string | null;
  venta_relacionada_id: string | null;
}

interface Paginacion {
  page: number;
  limit: number;
}

interface FiltroCuentaCorriente extends Paginacion {
  desde?: Date;
  hasta?: Date;
}

const clienteRepository = AppDataSource.getRepository(Clientes);
const ventaRepository = AppDataSource.getRepository(Venta);
const cobroRepository = AppDataSource.getRepository(Cobro);
const movimientoService = new MovimientoService();

const redondearMonto = (valor: number): number => Math.round(valor * 100) / 100;

const DEUDORES_CACHE_TTL_MS = 45_000;

interface DeudorListItem {
  cliente_id: number;
  nombre: string;
  telefono: string;
  direccion: string;
  estado: boolean;
  zona: number | null;
  repartidor: string;
  dia_reparto: string;
  saldo_actual: number;
  total_debitos: number;
  total_creditos: number;
  cantidad_movimientos: number;
  ultimo_movimiento_at: string | null;
}

interface DeudoresPayload {
  deudores: DeudorListItem[];
  paginacion: {
    total: number;
    pagina: number;
    porPagina: number;
    totalPaginas: number;
  };
}

const deudoresCache = new Map<string, { expiresAt: number; payload: DeudoresPayload }>();

const invalidarCacheDeudores = () => {
  deudoresCache.clear();
};

const isPoolBusyError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; errno?: number; message?: string };
  const msg = String(err.message ?? '').toLowerCase();
  return (
    err.code === 'ER_CON_COUNT_ERROR' ||
    err.errno === 1040 ||
    msg.includes('too many connections') ||
    msg.includes('queue limit reached') ||
    msg.includes('acquire timeout') ||
    msg.includes('connection acquisition timeout')
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function queryWithRetry<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return (await AppDataSource.query(sql, params)) as T;
    } catch (error) {
      lastError = error;
      if (!isPoolBusyError(error) || attempt === 3) {
        throw error;
      }
      const waitMs = 400 * attempt;
      console.warn(
        `[CuentaCorrienteService] MySQL saturado (intento ${attempt}/3). Reintentando en ${waitMs}ms...`
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}

const serializarFecha = (fecha: Date | string): string => new Date(fecha).toISOString();
const MENSAJE_TABLA_COBROS_FALTANTE =
  'La tabla cobros no existe en la base de datos. Ejecuta la migración `migrations/crear_tabla_cobros.sql` o `migrations/crear_tablas_repartidor_rapido.sql`.';
const normalizarTexto = (valor: unknown): string => {
  if (typeof valor === 'string') {
    return valor;
  }

  if (valor === null || valor === undefined) {
    return '';
  }

  return String(valor);
};
const esErrorTablaFaltante = (error: unknown, tabla: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorBase = error as {
    code?: string;
    sql?: string;
    sqlMessage?: string;
    message?: string;
  };

  if (errorBase.code !== 'ER_NO_SUCH_TABLE') {
    return false;
  }

  const contenido = [errorBase.sql, errorBase.sqlMessage, errorBase.message]
    .filter((valor): valor is string => typeof valor === 'string')
    .join(' ')
    .toLowerCase();

  return contenido.includes(`\`${tabla.toLowerCase()}\``) || contenido.includes(tabla.toLowerCase());
};

const compararMovimientos = (
  a: { fecha: string; origen: 'VENTA' | 'COBRO'; referencia_id: string },
  b: { fecha: string; origen: 'VENTA' | 'COBRO'; referencia_id: string }
) => {
  const diferenciaFecha = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  if (diferenciaFecha !== 0) {
    return diferenciaFecha;
  }

  const diferenciaOrigen = a.origen.localeCompare(b.origen);
  if (diferenciaOrigen !== 0) {
    return diferenciaOrigen;
  }

  return a.referencia_id.localeCompare(b.referencia_id);
};

export class CuentaCorrienteService {
  private async obtenerClienteBase(clienteId: number): Promise<ClienteCuentaBase> {
    const cliente = await clienteRepository.findOne({
      where: { id: clienteId },
      relations: ['zona']
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      estado: cliente.estado,
      zona: cliente.zona?.id ?? null,
      repartidor: cliente.repartidor,
      dia_reparto: cliente.dia_reparto
    };
  }

  private async obtenerVentasConSaldo(clienteId: number): Promise<Venta[]> {
    return ventaRepository
      .createQueryBuilder('venta')
      .where('venta.cliente_id = :clienteId', { clienteId: String(clienteId) })
      .andWhere('venta.saldo = :saldo', { saldo: true })
      .orderBy('venta.fecha_venta', 'ASC')
      .getMany();
  }

  private async obtenerCobros(clienteId?: number, filtros?: { desde?: Date; hasta?: Date }): Promise<Cobro[]> {
    try {
      const query = cobroRepository.createQueryBuilder('cobro');

      if (clienteId !== undefined) {
        query.where('cobro.cliente_id = :clienteId', { clienteId });
      }

      if (filtros?.desde) {
        query.andWhere('cobro.fecha_cobro >= :desde', { desde: filtros.desde });
      }

      if (filtros?.hasta) {
        query.andWhere('cobro.fecha_cobro <= :hasta', { hasta: filtros.hasta });
      }

      return query.orderBy('cobro.fecha_cobro', 'DESC').getMany();
    } catch (error) {
      if (esErrorTablaFaltante(error, 'cobros')) {
        console.warn(`[CuentaCorrienteService] ${MENSAJE_TABLA_COBROS_FALTANTE}`);
        return [];
      }

      throw error;
    }
  }

  private mapearVentaAMovimiento(venta: Venta): MovimientoCuentaCorriente | null {
    const debito = Number(venta.saldo_monto || 0);
    if (Number.isNaN(debito) || debito <= 0) {
      return null;
    }

    const descripcionBase =
      venta.forma_pago === 'parcial'
        ? `Venta ${venta.tipo.toLowerCase()} con saldo pendiente`
        : `Venta ${venta.tipo.toLowerCase()} fiada`;

    return {
      id: `venta-${venta.venta_id}`,
      fecha: serializarFecha(venta.fecha_venta),
      tipo: 'DEBITO_VENTA',
      origen: 'VENTA',
      referencia_id: venta.venta_id,
      descripcion: descripcionBase,
      debito: redondearMonto(debito),
      credito: 0,
      saldo_acumulado: 0,
      medio_pago: venta.medio_pago,
      observaciones: venta.observaciones || null,
      venta_relacionada_id: venta.venta_id
    };
  }

  private mapearCobroAMovimiento(cobro: Cobro): MovimientoCuentaCorriente | null {
    const credito = Number(cobro.monto || 0);
    if (Number.isNaN(credito) || credito <= 0) {
      return null;
    }

    return {
      id: `cobro-${cobro.id}`,
      fecha: serializarFecha(cobro.fecha_cobro),
      tipo: 'CREDITO_COBRO',
      origen: 'COBRO',
      referencia_id: cobro.id.toString(),
      descripcion: `Cobro a ${cobro.nombre_cliente || 'cliente'} por $${credito}`,
      debito: 0,
      credito: redondearMonto(credito),
      saldo_acumulado: 0,
      medio_pago: cobro.medio_pago,
      observaciones: cobro.observaciones || null,
      venta_relacionada_id: cobro.venta_relacionada_id || null
    };
  }

  private construirMovimientos(ventas: Venta[], cobros: Cobro[]): MovimientoCuentaCorriente[] {
    const movimientos = [
      ...ventas.map((venta) => this.mapearVentaAMovimiento(venta)).filter(Boolean) as MovimientoCuentaCorriente[],
      ...cobros.map((cobro) => this.mapearCobroAMovimiento(cobro)).filter(Boolean) as MovimientoCuentaCorriente[]
    ].sort(compararMovimientos);

    let saldoAcumulado = 0;

    return movimientos.map((movimiento) => {
      saldoAcumulado += movimiento.debito - movimiento.credito;

      return {
        ...movimiento,
        saldo_acumulado: redondearMonto(saldoAcumulado)
      };
    });
  }

  private filtrarMovimientosPorFecha(
    movimientos: MovimientoCuentaCorriente[],
    filtros: { desde?: Date; hasta?: Date }
  ): MovimientoCuentaCorriente[] {
    return movimientos.filter((movimiento) => {
      const fecha = new Date(movimiento.fecha).getTime();

      if (filtros.desde && fecha < filtros.desde.getTime()) {
        return false;
      }

      if (filtros.hasta && fecha > filtros.hasta.getTime()) {
        return false;
      }

      return true;
    });
  }

  private construirResumen(cliente: ClienteCuentaBase, movimientos: MovimientoCuentaCorriente[]) {
    const totalDebitos = redondearMonto(
      movimientos.reduce((acumulado, movimiento) => acumulado + movimiento.debito, 0)
    );
    const totalCreditos = redondearMonto(
      movimientos.reduce((acumulado, movimiento) => acumulado + movimiento.credito, 0)
    );
    const saldoActual = redondearMonto(totalDebitos - totalCreditos);
    const ultimoMovimiento = movimientos.length > 0 ? movimientos[movimientos.length - 1] : null;

    return {
      cliente,
      saldo_actual: saldoActual,
      total_debitos: totalDebitos,
      total_creditos: totalCreditos,
      cantidad_movimientos: movimientos.length,
      ultimo_movimiento_at: ultimoMovimiento ? ultimoMovimiento.fecha : null
    };
  }

  async crearCobroParaCliente(input: {
    cliente_id: number;
    monto: number;
    medio_pago: MedioPago;
    observaciones?: string;
    venta_relacionada_id?: string | null;
    repartidor_id?: number | null;
  }) {
    const monto = Number(input.monto);

    if (Number.isNaN(monto) || monto <= 0) {
      throw new Error('El monto debe ser un número mayor a 0');
    }

    const mediosPagoValidos: MedioPago[] = ['efectivo', 'transferencia', 'debito', 'credito'];
    if (!mediosPagoValidos.includes(input.medio_pago)) {
      throw new Error('Medio de pago inválido');
    }

    const cliente = await this.obtenerClienteBase(input.cliente_id);

    let cobroGuardado: Cobro;

    const queryRunner = AppDataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const cobro = queryRunner.manager.create(Cobro, {
        cliente_id: input.cliente_id,
        nombre_cliente: cliente.nombre,
        monto,
        medio_pago: input.medio_pago,
        observaciones: input.observaciones,
        venta_relacionada_id: input.venta_relacionada_id || undefined,
        repartidor_id: input.repartidor_id ?? undefined
      });

      cobroGuardado = await queryRunner.manager.save(cobro);
      await queryRunner.commitTransaction();
      invalidarCacheDeudores();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      if (esErrorTablaFaltante(error, 'cobros')) {
        throw new Error(MENSAJE_TABLA_COBROS_FALTANTE);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }

    // Post-tx: fuera del runner para no pedir otra conexión del pool mientras lo retiene.
    try {
      await movimientoService.registrarCobroCliente(monto, cliente.nombre, {
        cobro_id: cobroGuardado!.id,
        cliente_id: input.cliente_id,
        medio_pago: input.medio_pago,
        venta_relacionada_id: input.venta_relacionada_id,
        repartidor_id: input.repartidor_id
      });
    } catch (error) {
      console.error('Error al registrar movimiento de cobro de cliente:', error);
    }

    const resumen = await this.obtenerResumenPorCliente(input.cliente_id);

    return {
      cobro: {
        id: cobroGuardado!.id,
        cliente_id: cobroGuardado!.cliente_id,
        nombre_cliente: cobroGuardado!.nombre_cliente,
        monto: redondearMonto(Number(cobroGuardado!.monto)),
        medio_pago: cobroGuardado!.medio_pago,
        observaciones: cobroGuardado!.observaciones || null,
        venta_relacionada_id: cobroGuardado!.venta_relacionada_id || null,
        repartidor_id: cobroGuardado!.repartidor_id ?? null,
        fecha_cobro: serializarFecha(cobroGuardado!.fecha_cobro)
      },
      saldo_actual: resumen.saldo_actual
    };
  }

  async obtenerResumenPorCliente(clienteId: number) {
    // Secuencial: evita ocupar 3 conexiones del pool a la vez por request
    const cliente = await this.obtenerClienteBase(clienteId);
    const ventas = await this.obtenerVentasConSaldo(clienteId);
    const cobros = await this.obtenerCobros(clienteId);

    const movimientos = this.construirMovimientos(ventas, cobros.reverse());
    return this.construirResumen(cliente, movimientos);
  }

  async obtenerCuentaCorrientePorCliente(clienteId: number, filtros: FiltroCuentaCorriente) {
    const cliente = await this.obtenerClienteBase(clienteId);
    const ventas = await this.obtenerVentasConSaldo(clienteId);
    const cobros = await this.obtenerCobros(clienteId);

    const movimientosGlobales = this.construirMovimientos(ventas, [...cobros].reverse());
    const movimientosFiltrados = this.filtrarMovimientosPorFecha(movimientosGlobales, filtros);
    const movimientosPaginados = [...movimientosFiltrados]
      .sort((a, b) => compararMovimientos(b, a))
      .slice((filtros.page - 1) * filtros.limit, filtros.page * filtros.limit);

    return {
      resumen: this.construirResumen(cliente, movimientosGlobales),
      movimientos: movimientosPaginados,
      paginacion: {
        total: movimientosFiltrados.length,
        pagina: filtros.page,
        porPagina: filtros.limit,
        totalPaginas: Math.ceil(movimientosFiltrados.length / filtros.limit) || 1
      }
    };
  }

  async obtenerCobrosPorCliente(clienteId: number, filtros: FiltroCuentaCorriente) {
    await this.obtenerClienteBase(clienteId);

    const cobros = await this.obtenerCobros(clienteId, filtros);
    const total = cobros.length;
    const cobrosPaginados = cobros.slice((filtros.page - 1) * filtros.limit, filtros.page * filtros.limit);

    return {
      cobros: cobrosPaginados.map((cobro) => ({
        id: cobro.id,
        cliente_id: cobro.cliente_id,
        nombre_cliente: cobro.nombre_cliente,
        monto: redondearMonto(Number(cobro.monto)),
        medio_pago: cobro.medio_pago,
        observaciones: cobro.observaciones || null,
        venta_relacionada_id: cobro.venta_relacionada_id || null,
        repartidor_id: cobro.repartidor_id ?? null,
        fecha_cobro: serializarFecha(cobro.fecha_cobro)
      })),
      paginacion: {
        total,
        pagina: filtros.page,
        porPagina: filtros.limit,
        totalPaginas: Math.ceil(total / filtros.limit) || 1
      }
    };
  }

  async obtenerClientesDeudores(filtros: Paginacion & { search?: string }) {
    const page = filtros.page;
    const limit = filtros.limit;
    const offset = (page - 1) * limit;
    const termino = normalizarTexto(filtros.search).trim().toLowerCase();
    const cacheKey = `deudores:${termino}:${page}:${limit}`;
    const cached = deudoresCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const params: Array<string | number> = [];
    let searchClause = '';
    if (termino) {
      searchClause = `AND (
        LOWER(c.nombre) LIKE ?
        OR LOWER(IFNULL(c.telefono, '')) LIKE ?
        OR LOWER(IFNULL(c.direccion, '')) LIKE ?
      )`;
      const like = `%${termino}%`;
      params.push(like, like, like);
    }

    // Una sola query agregada + LIMIT: evita cargar todo en memoria y
    // no abre varias conexiones en paralelo (evita hang → Failed to fetch).
    const buildSql = (incluirCobros: boolean) => {
      const joinCobros = incluirCobros
        ? `LEFT JOIN (
            SELECT
              cob.cliente_id AS cliente_id,
              SUM(cob.monto) AS total_creditos,
              COUNT(*) AS cantidad,
              MAX(cob.fecha_cobro) AS ultimo_at
            FROM cobros cob
            GROUP BY cob.cliente_id
          ) cr ON cr.cliente_id = c.id`
        : '';
      const totalCreditos = incluirCobros ? 'COALESCE(cr.total_creditos, 0)' : '0';
      const cantidadCreditos = incluirCobros ? 'COALESCE(cr.cantidad, 0)' : '0';
      const ultimoCredito = incluirCobros ? 'cr.ultimo_at' : 'NULL';

      return `
        SELECT
          c.id AS cliente_id,
          c.nombre AS nombre,
          c.telefono AS telefono,
          c.direccion AS direccion,
          c.estado AS estado,
          c.zona AS zona,
          c.repartidor AS repartidor,
          c.dia_reparto AS dia_reparto,
          COALESCE(d.total_debitos, 0) AS total_debitos,
          ${totalCreditos} AS total_creditos,
          (COALESCE(d.total_debitos, 0) - ${totalCreditos}) AS saldo_actual,
          (COALESCE(d.cantidad, 0) + ${cantidadCreditos}) AS cantidad_movimientos,
          CASE
            WHEN d.ultimo_at IS NULL THEN ${ultimoCredito}
            WHEN ${ultimoCredito} IS NULL THEN d.ultimo_at
            WHEN d.ultimo_at >= ${ultimoCredito} THEN d.ultimo_at
            ELSE ${ultimoCredito}
          END AS ultimo_movimiento_at
        FROM clientes c
        LEFT JOIN (
          SELECT
            CAST(v.cliente_id AS UNSIGNED) AS cliente_id,
            SUM(CAST(v.saldo_monto AS DECIMAL(12,2))) AS total_debitos,
            COUNT(*) AS cantidad,
            MAX(v.fecha_venta) AS ultimo_at
          FROM venta v
          WHERE v.saldo = 1
            AND v.cliente_id IS NOT NULL
            AND v.cliente_id <> ''
            AND CAST(v.saldo_monto AS DECIMAL(12,2)) > 0
          GROUP BY CAST(v.cliente_id AS UNSIGNED)
        ) d ON d.cliente_id = c.id
        ${joinCobros}
        WHERE (COALESCE(d.total_debitos, 0) - ${totalCreditos}) > 0
          ${searchClause}
        ORDER BY saldo_actual DESC, c.nombre ASC
        LIMIT ? OFFSET ?
      `;
    };

    const buildCountSql = (incluirCobros: boolean) => {
      const joinCobros = incluirCobros
        ? `LEFT JOIN (
            SELECT
              cob.cliente_id AS cliente_id,
              SUM(cob.monto) AS total_creditos
            FROM cobros cob
            GROUP BY cob.cliente_id
          ) cr ON cr.cliente_id = c.id`
        : '';
      const totalCreditos = incluirCobros ? 'COALESCE(cr.total_creditos, 0)' : '0';

      return `
        SELECT COUNT(*) AS total
        FROM (
          SELECT c.id
          FROM clientes c
          LEFT JOIN (
            SELECT
              CAST(v.cliente_id AS UNSIGNED) AS cliente_id,
              SUM(CAST(v.saldo_monto AS DECIMAL(12,2))) AS total_debitos
            FROM venta v
            WHERE v.saldo = 1
              AND v.cliente_id IS NOT NULL
              AND v.cliente_id <> ''
              AND CAST(v.saldo_monto AS DECIMAL(12,2)) > 0
            GROUP BY CAST(v.cliente_id AS UNSIGNED)
          ) d ON d.cliente_id = c.id
          ${joinCobros}
          WHERE (COALESCE(d.total_debitos, 0) - ${totalCreditos}) > 0
            ${searchClause}
        ) t
      `;
    };

    const queryParams = [...params, limit, offset];
    const countParams = termino
      ? [`%${termino}%`, `%${termino}%`, `%${termino}%`]
      : [];

    let rows: Array<Record<string, unknown>>;
    let incluirCobros = true;
    try {
      rows = await queryWithRetry(buildSql(true), queryParams);
    } catch (error) {
      if (!esErrorTablaFaltante(error, 'cobros')) {
        throw error;
      }
      console.warn(`[CuentaCorrienteService] ${MENSAJE_TABLA_COBROS_FALTANTE}`);
      incluirCobros = false;
      rows = await queryWithRetry(buildSql(false), queryParams);
    }

    let total = 0;
    if (page === 1 && rows.length < limit) {
      total = rows.length;
    } else {
      const countRows = await queryWithRetry<Array<{ total: number | string }>>(
        buildCountSql(incluirCobros),
        countParams
      );
      total = Number(countRows[0]?.total ?? 0);
    }

    const deudores: DeudorListItem[] = rows.map((row) => {
      const totalDebitos = redondearMonto(Number(row.total_debitos || 0));
      const totalCreditos = redondearMonto(Number(row.total_creditos || 0));
      const saldoActual = redondearMonto(Number(row.saldo_actual || 0));
      const ultimo = row.ultimo_movimiento_at
        ? serializarFecha(row.ultimo_movimiento_at as Date | string)
        : null;

      return {
        cliente_id: Number(row.cliente_id),
        nombre: normalizarTexto(row.nombre),
        telefono: normalizarTexto(row.telefono),
        direccion: normalizarTexto(row.direccion),
        estado: Boolean(row.estado),
        zona: row.zona == null || row.zona === '' ? null : Number(row.zona),
        repartidor: normalizarTexto(row.repartidor),
        dia_reparto: normalizarTexto(row.dia_reparto),
        saldo_actual: saldoActual,
        total_debitos: totalDebitos,
        total_creditos: totalCreditos,
        cantidad_movimientos: Number(row.cantidad_movimientos || 0),
        ultimo_movimiento_at: ultimo
      };
    });

    const payload: DeudoresPayload = {
      deudores,
      paginacion: {
        total,
        pagina: page,
        porPagina: limit,
        totalPaginas: Math.ceil(total / limit) || 1
      }
    };

    deudoresCache.set(cacheKey, {
      expiresAt: Date.now() + DEUDORES_CACHE_TTL_MS,
      payload
    });

    return payload;
  }

  /**
   * Resumen de fiados de un día en pocas queries (evita el N+1 del frontend
   * que saturaba el pool MySQL con lotes concurrentes).
   */
  async obtenerResumenFiadosPorFecha(fecha: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error('Parámetro de fecha inválido');
    }

    const desde = new Date(`${fecha}T00:00:00.000Z`);
    const hasta = new Date(`${fecha}T23:59:59.999Z`);

    const ventas = await ventaRepository
      .createQueryBuilder('venta')
      .where('venta.fecha_venta BETWEEN :desde AND :hasta', { desde, hasta })
      .andWhere('venta.saldo = :saldo', { saldo: true })
      .andWhere('venta.cliente_id IS NOT NULL')
      .andWhere("venta.cliente_id <> ''")
      .orderBy('venta.fecha_venta', 'DESC')
      .getMany();

    const ventasConSaldo = ventas.filter((venta) => {
      const monto = Number(venta.saldo_monto || 0);
      return !Number.isNaN(monto) && monto > 0;
    });

    const ventaIds = ventasConSaldo.map((venta) => venta.venta_id);
    let cobros: Cobro[] = [];

    if (ventaIds.length > 0) {
      try {
        cobros = await cobroRepository
          .createQueryBuilder('cobro')
          .where('cobro.venta_relacionada_id IN (:...ventaIds)', { ventaIds })
          .getMany();
      } catch (error) {
        if (esErrorTablaFaltante(error, 'cobros')) {
          cobros = [];
        } else {
          throw error;
        }
      }
    }

    const cobrosPorVenta = new Map<string, Cobro>();
    for (const cobro of cobros) {
      if (!cobro.venta_relacionada_id) continue;
      const existente = cobrosPorVenta.get(cobro.venta_relacionada_id);
      if (!existente || new Date(cobro.fecha_cobro) > new Date(existente.fecha_cobro)) {
        cobrosPorVenta.set(cobro.venta_relacionada_id, cobro);
      }
    }

    const fiados = ventasConSaldo.map((venta) => {
      const monto = redondearMonto(Number(venta.saldo_monto || 0));
      const cobro = cobrosPorVenta.get(venta.venta_id);
      const descripcionBase =
        venta.forma_pago === 'parcial'
          ? `Venta ${venta.tipo.toLowerCase()} con saldo pendiente`
          : `Venta ${venta.tipo.toLowerCase()} fiada`;

      return {
        id: `venta-${venta.venta_id}`,
        referenciaId: venta.venta_id,
        clienteId: Number(venta.cliente_id) || 0,
        clienteNombre: normalizarTexto(venta.nombre_cliente) || 'Cliente',
        monto,
        fecha: serializarFecha(venta.fecha_venta),
        descripcion: descripcionBase,
        cobrado: Boolean(cobro),
        montoCobrado: cobro ? redondearMonto(Number(cobro.monto)) : 0,
        fechaCobro: cobro ? serializarFecha(cobro.fecha_cobro) : null
      };
    });

    const cobrados = fiados.filter((fiado) => fiado.cobrado);
    const pendientes = fiados.filter((fiado) => !fiado.cobrado);

    return {
      fecha,
      totalFiado: redondearMonto(fiados.reduce((total, fiado) => total + fiado.monto, 0)),
      cantidadFiados: fiados.length,
      cantidadCobrados: cobrados.length,
      totalCobrado: redondearMonto(cobrados.reduce((total, fiado) => total + fiado.montoCobrado, 0)),
      cantidadPendientes: pendientes.length,
      totalPendiente: redondearMonto(pendientes.reduce((total, fiado) => total + fiado.monto, 0)),
      porcentajeCobrados:
        fiados.length > 0 ? Math.round((cobrados.length / fiados.length) * 100) : 0,
      fiados
    };
  }
}
