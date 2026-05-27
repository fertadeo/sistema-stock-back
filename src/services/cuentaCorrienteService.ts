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

const serializarFecha = (fecha: Date | string): string => new Date(fecha).toISOString();
const normalizarTexto = (valor: unknown): string => {
  if (typeof valor === 'string') {
    return valor;
  }

  if (valor === null || valor === undefined) {
    return '';
  }

  return String(valor);
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

  private async obtenerCobros(clienteId: number, filtros?: { desde?: Date; hasta?: Date }): Promise<Cobro[]> {
    const query = cobroRepository
      .createQueryBuilder('cobro')
      .where('cobro.cliente_id = :clienteId', { clienteId });

    if (filtros?.desde) {
      query.andWhere('cobro.fecha_cobro >= :desde', { desde: filtros.desde });
    }

    if (filtros?.hasta) {
      query.andWhere('cobro.fecha_cobro <= :hasta', { hasta: filtros.hasta });
    }

    return query.orderBy('cobro.fecha_cobro', 'DESC').getMany();
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

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cobro = queryRunner.manager.create(Cobro, {
        cliente_id: input.cliente_id,
        nombre_cliente: cliente.nombre,
        monto,
        medio_pago: input.medio_pago,
        observaciones: input.observaciones,
        venta_relacionada_id: input.venta_relacionada_id || undefined,
        repartidor_id: input.repartidor_id ?? undefined
      });

      const cobroGuardado = await queryRunner.manager.save(cobro);
      await queryRunner.commitTransaction();

      try {
        await movimientoService.registrarCobroCliente(monto, cliente.nombre, {
          cobro_id: cobroGuardado.id,
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
          id: cobroGuardado.id,
          cliente_id: cobroGuardado.cliente_id,
          nombre_cliente: cobroGuardado.nombre_cliente,
          monto: redondearMonto(Number(cobroGuardado.monto)),
          medio_pago: cobroGuardado.medio_pago,
          observaciones: cobroGuardado.observaciones || null,
          venta_relacionada_id: cobroGuardado.venta_relacionada_id || null,
          repartidor_id: cobroGuardado.repartidor_id ?? null,
          fecha_cobro: serializarFecha(cobroGuardado.fecha_cobro)
        },
        saldo_actual: resumen.saldo_actual
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async obtenerResumenPorCliente(clienteId: number) {
    const [cliente, ventas, cobros] = await Promise.all([
      this.obtenerClienteBase(clienteId),
      this.obtenerVentasConSaldo(clienteId),
      this.obtenerCobros(clienteId)
    ]);

    const movimientos = this.construirMovimientos(ventas, cobros.reverse());
    return this.construirResumen(cliente, movimientos);
  }

  async obtenerCuentaCorrientePorCliente(clienteId: number, filtros: FiltroCuentaCorriente) {
    const [cliente, ventas, cobros] = await Promise.all([
      this.obtenerClienteBase(clienteId),
      this.obtenerVentasConSaldo(clienteId),
      this.obtenerCobros(clienteId)
    ]);

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
    const [clientes, ventasConSaldo, cobros] = await Promise.all([
      clienteRepository.find({ relations: ['zona'] }),
      ventaRepository
        .createQueryBuilder('venta')
        .where('venta.cliente_id IS NOT NULL')
        .andWhere("venta.cliente_id <> ''")
        .andWhere('venta.saldo = :saldo', { saldo: true })
        .getMany(),
      cobroRepository.find()
    ]);

    const debitosPorCliente = new Map<number, number>();
    const creditosPorCliente = new Map<number, number>();
    const movimientosPorCliente = new Map<number, number>();
    const ultimoMovimientoPorCliente = new Map<number, Date>();

    for (const venta of ventasConSaldo) {
      const clienteId = Number(venta.cliente_id);
      const debito = Number(venta.saldo_monto || 0);

      if (Number.isNaN(clienteId) || Number.isNaN(debito) || debito <= 0) {
        continue;
      }

      debitosPorCliente.set(clienteId, redondearMonto((debitosPorCliente.get(clienteId) || 0) + debito));
      movimientosPorCliente.set(clienteId, (movimientosPorCliente.get(clienteId) || 0) + 1);

      const fechaVenta = new Date(venta.fecha_venta);
      const ultimaFecha = ultimoMovimientoPorCliente.get(clienteId);
      if (!ultimaFecha || fechaVenta > ultimaFecha) {
        ultimoMovimientoPorCliente.set(clienteId, fechaVenta);
      }
    }

    for (const cobro of cobros) {
      const clienteId = Number(cobro.cliente_id);
      const credito = Number(cobro.monto || 0);

      if (Number.isNaN(clienteId) || Number.isNaN(credito) || credito <= 0) {
        continue;
      }

      creditosPorCliente.set(clienteId, redondearMonto((creditosPorCliente.get(clienteId) || 0) + credito));
      movimientosPorCliente.set(clienteId, (movimientosPorCliente.get(clienteId) || 0) + 1);

      const fechaCobro = new Date(cobro.fecha_cobro);
      const ultimaFecha = ultimoMovimientoPorCliente.get(clienteId);
      if (!ultimaFecha || fechaCobro > ultimaFecha) {
        ultimoMovimientoPorCliente.set(clienteId, fechaCobro);
      }
    }

    const termino = normalizarTexto(filtros.search).trim().toLowerCase();

    const deudores = clientes
      .filter((cliente) => {
        if (!termino) {
          return true;
        }

        return [cliente.nombre, cliente.telefono, cliente.direccion]
          .map((valor) => normalizarTexto(valor).toLowerCase())
          .filter(Boolean)
          .some((valor) => valor.toLowerCase().includes(termino));
      })
      .map((cliente) => {
        const totalDebitos = debitosPorCliente.get(cliente.id) || 0;
        const totalCreditos = creditosPorCliente.get(cliente.id) || 0;
        const saldoActual = redondearMonto(totalDebitos - totalCreditos);
        const nombre = normalizarTexto(cliente.nombre);
        const telefono = normalizarTexto(cliente.telefono);
        const direccion = normalizarTexto(cliente.direccion);
        const repartidor = normalizarTexto(cliente.repartidor);
        const diaReparto = normalizarTexto(cliente.dia_reparto);

        return {
          cliente_id: cliente.id,
          nombre,
          telefono,
          direccion,
          estado: cliente.estado,
          zona: cliente.zona?.id ?? null,
          repartidor,
          dia_reparto: diaReparto,
          saldo_actual: saldoActual,
          total_debitos: redondearMonto(totalDebitos),
          total_creditos: redondearMonto(totalCreditos),
          cantidad_movimientos: movimientosPorCliente.get(cliente.id) || 0,
          ultimo_movimiento_at: ultimoMovimientoPorCliente.get(cliente.id)
            ? serializarFecha(ultimoMovimientoPorCliente.get(cliente.id) as Date)
            : null
        };
      })
      .filter((cliente) => cliente.saldo_actual > 0)
      .sort((a, b) => {
        if (b.saldo_actual !== a.saldo_actual) {
          return b.saldo_actual - a.saldo_actual;
        }

        return normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre));
      });

    const total = deudores.length;
    const resultados = deudores.slice((filtros.page - 1) * filtros.limit, filtros.page * filtros.limit);

    return {
      deudores: resultados,
      paginacion: {
        total,
        pagina: filtros.page,
        porPagina: filtros.limit,
        totalPaginas: Math.ceil(total / filtros.limit) || 1
      }
    };
  }
}
