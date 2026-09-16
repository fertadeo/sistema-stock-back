import { AppDataSource } from '../config/database';
import { Repartidor } from '../entities/Repartidor';
import { PagoRepartidor } from '../entities/PagoRepartidor';
import { VentaCerrada } from '../entities/VentaCerrada';
import { Cobro } from '../entities/Cobro';

type MedioPago = 'efectivo' | 'transferencia' | 'debito' | 'credito';

interface MovimientoCuentaCorrienteRepartidor {
  id: string;
  fecha: string;
  tipo: 'DEBITO_CIERRE' | 'CREDITO_PAGO' | 'CREDITO_COBRO';
  origen: 'CIERRE' | 'PAGO' | 'COBRO';
  referencia_id: string;
  descripcion: string;
  debito: number;
  credito: number;
  saldo_acumulado: number;
  medio_pago: MedioPago | null;
  observaciones: string | null;
}

interface Paginacion {
  page: number;
  limit: number;
}

interface FiltroCuentaCorriente extends Paginacion {
  desde?: Date;
  hasta?: Date;
}

const repartidorRepository = AppDataSource.getRepository(Repartidor);
const pagoRepartidorRepository = AppDataSource.getRepository(PagoRepartidor);
const ventaCerradaRepository = AppDataSource.getRepository(VentaCerrada);
const cobroRepository = AppDataSource.getRepository(Cobro);

const redondearMonto = (valor: number): number => Math.round(valor * 100) / 100;
const serializarFecha = (fecha: Date | string): string => new Date(fecha).toISOString();

export class CuentaCorrienteRepartidorService {
  private async obtenerRepartidor(repartidorId: number): Promise<Repartidor> {
    const repartidor = await repartidorRepository.findOne({
      where: { id: repartidorId }
    });

    if (!repartidor) {
      throw new Error('Repartidor no encontrado');
    }

    return repartidor;
  }

  private async obtenerCierresConDeuda(repartidorId: number): Promise<VentaCerrada[]> {
    return ventaCerradaRepository
      .createQueryBuilder('cierre')
      .where('cierre.repartidor_id = :repartidorId', { repartidorId })
      .andWhere('cierre.balance_fiado > 0')
      .andWhere('cierre.deleted_at IS NULL')
      .orderBy('cierre.fecha_cierre', 'ASC')
      .getMany();
  }

  private async obtenerPagos(repartidorId: number, filtros?: { desde?: Date; hasta?: Date }): Promise<PagoRepartidor[]> {
    const query = pagoRepartidorRepository.createQueryBuilder('pago');
    
    query.where('pago.repartidor_id = :repartidorId', { repartidorId });

    if (filtros?.desde) {
      query.andWhere('pago.fecha_pago >= :desde', { desde: filtros.desde });
    }

    if (filtros?.hasta) {
      query.andWhere('pago.fecha_pago <= :hasta', { hasta: filtros.hasta });
    }

    return query.orderBy('pago.fecha_pago', 'DESC').getMany();
  }

  private async obtenerCobrosRepartidor(repartidorId: number, filtros?: { desde?: Date; hasta?: Date }): Promise<Cobro[]> {
    const query = cobroRepository.createQueryBuilder('cobro');
    
    query.where('cobro.repartidor_id = :repartidorId', { repartidorId });

    if (filtros?.desde) {
      query.andWhere('cobro.fecha_cobro >= :desde', { desde: filtros.desde });
    }

    if (filtros?.hasta) {
      query.andWhere('cobro.fecha_cobro <= :hasta', { hasta: filtros.hasta });
    }

    return query.orderBy('cobro.fecha_cobro', 'DESC').getMany();
  }

  private mapearCierreAMovimiento(cierre: VentaCerrada): MovimientoCuentaCorrienteRepartidor | null {
    const debito = Number(cierre.balance_fiado || 0);
    if (Number.isNaN(debito) || debito <= 0) {
      return null;
    }

    return {
      id: `cierre-${cierre.id}`,
      fecha: serializarFecha(cierre.fecha_cierre),
      tipo: 'DEBITO_CIERRE',
      origen: 'CIERRE',
      referencia_id: cierre.id.toString(),
      descripcion: `Cierre de ventas - Balance fiado`,
      debito: redondearMonto(debito),
      credito: 0,
      saldo_acumulado: 0,
      medio_pago: null,
      observaciones: cierre.observaciones || null
    };
  }

  private mapearPagoAMovimiento(pago: PagoRepartidor): MovimientoCuentaCorrienteRepartidor | null {
    const credito = Number(pago.monto || 0);
    if (Number.isNaN(credito) || credito <= 0) {
      return null;
    }

    return {
      id: `pago-${pago.id}`,
      fecha: serializarFecha(pago.fecha_pago),
      tipo: 'CREDITO_PAGO',
      origen: 'PAGO',
      referencia_id: pago.id.toString(),
      descripcion: `Pago del repartidor por $${credito}`,
      debito: 0,
      credito: redondearMonto(credito),
      saldo_acumulado: 0,
      medio_pago: pago.medio_pago,
      observaciones: pago.observaciones || null
    };
  }

  private mapearCobroAMovimiento(cobro: Cobro): MovimientoCuentaCorrienteRepartidor | null {
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
      descripcion: `Cobro a cliente ${cobro.nombre_cliente || 'desconocido'} por $${credito}`,
      debito: 0,
      credito: redondearMonto(credito),
      saldo_acumulado: 0,
      medio_pago: cobro.medio_pago,
      observaciones: cobro.observaciones || null
    };
  }

  private compararMovimientos(
    a: { fecha: string; origen: 'CIERRE' | 'PAGO' | 'COBRO'; referencia_id: string },
    b: { fecha: string; origen: 'CIERRE' | 'PAGO' | 'COBRO'; referencia_id: string }
  ) {
    const diferenciaFecha = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    if (diferenciaFecha !== 0) {
      return diferenciaFecha;
    }

    const diferenciaOrigen = a.origen.localeCompare(b.origen);
    if (diferenciaOrigen !== 0) {
      return diferenciaOrigen;
    }

    return a.referencia_id.localeCompare(b.referencia_id);
  }

  private construirMovimientos(
    cierres: VentaCerrada[], 
    pagos: PagoRepartidor[],
    cobros: Cobro[]
  ): MovimientoCuentaCorrienteRepartidor[] {
    const movimientos = [
      ...cierres.map((cierre) => this.mapearCierreAMovimiento(cierre)).filter(Boolean) as MovimientoCuentaCorrienteRepartidor[],
      ...pagos.map((pago) => this.mapearPagoAMovimiento(pago)).filter(Boolean) as MovimientoCuentaCorrienteRepartidor[],
      ...cobros.map((cobro) => this.mapearCobroAMovimiento(cobro)).filter(Boolean) as MovimientoCuentaCorrienteRepartidor[]
    ].sort(this.compararMovimientos);

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
    movimientos: MovimientoCuentaCorrienteRepartidor[],
    filtros: { desde?: Date; hasta?: Date }
  ): MovimientoCuentaCorrienteRepartidor[] {
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

  private construirResumen(repartidor: Repartidor, movimientos: MovimientoCuentaCorrienteRepartidor[]) {
    const totalDebitos = redondearMonto(
      movimientos.reduce((acumulado, movimiento) => acumulado + movimiento.debito, 0)
    );
    const totalCreditos = redondearMonto(
      movimientos.reduce((acumulado, movimiento) => acumulado + movimiento.credito, 0)
    );
    const saldoActual = redondearMonto(totalDebitos - totalCreditos);
    const ultimoMovimiento = movimientos.length > 0 ? movimientos[movimientos.length - 1] : null;

    return {
      repartidor: {
        id: repartidor.id,
        nombre: repartidor.nombre,
        telefono: repartidor.telefono,
        zona_reparto: repartidor.zona_reparto,
        activo: repartidor.activo
      },
      saldo_actual: saldoActual,
      total_debitos: totalDebitos,
      total_creditos: totalCreditos,
      cantidad_movimientos: movimientos.length,
      ultimo_movimiento_at: ultimoMovimiento ? ultimoMovimiento.fecha : null
    };
  }

  async crearPagoRepartidor(input: {
    repartidor_id: number;
    monto: number;
    medio_pago: MedioPago;
    observaciones?: string;
    usuario_registro_id?: number;
  }) {
    const monto = Number(input.monto);

    if (Number.isNaN(monto) || monto <= 0) {
      throw new Error('El monto debe ser un número mayor a 0');
    }

    const mediosPagoValidos: MedioPago[] = ['efectivo', 'transferencia', 'debito', 'credito'];
    if (!mediosPagoValidos.includes(input.medio_pago)) {
      throw new Error('Medio de pago inválido');
    }

    const repartidor = await this.obtenerRepartidor(input.repartidor_id);

    const pago = pagoRepartidorRepository.create({
      repartidor_id: input.repartidor_id,
      repartidor_nombre: repartidor.nombre,
      monto,
      medio_pago: input.medio_pago,
      observaciones: input.observaciones,
      usuario_registro_id: input.usuario_registro_id
    });

    const pagoGuardado = await pagoRepartidorRepository.save(pago);

    const resumen = await this.obtenerResumenPorRepartidor(input.repartidor_id);

    return {
      pago: {
        id: pagoGuardado.id,
        repartidor_id: pagoGuardado.repartidor_id,
        repartidor_nombre: pagoGuardado.repartidor_nombre,
        monto: redondearMonto(Number(pagoGuardado.monto)),
        medio_pago: pagoGuardado.medio_pago,
        observaciones: pagoGuardado.observaciones || null,
        usuario_registro_id: pagoGuardado.usuario_registro_id ?? null,
        fecha_pago: serializarFecha(pagoGuardado.fecha_pago)
      },
      saldo_actual: resumen.saldo_actual
    };
  }

  async obtenerResumenPorRepartidor(repartidorId: number) {
    const repartidor = await this.obtenerRepartidor(repartidorId);
    const cierres = await this.obtenerCierresConDeuda(repartidorId);
    const pagos = await this.obtenerPagos(repartidorId);
    const cobros = await this.obtenerCobrosRepartidor(repartidorId);

    const movimientos = this.construirMovimientos(cierres, pagos.reverse(), cobros.reverse());
    return this.construirResumen(repartidor, movimientos);
  }

  async obtenerCuentaCorrientePorRepartidor(repartidorId: number, filtros: FiltroCuentaCorriente) {
    const repartidor = await this.obtenerRepartidor(repartidorId);
    const cierres = await this.obtenerCierresConDeuda(repartidorId);
    const pagos = await this.obtenerPagos(repartidorId);
    const cobros = await this.obtenerCobrosRepartidor(repartidorId);

    const movimientosGlobales = this.construirMovimientos(cierres, [...pagos].reverse(), [...cobros].reverse());
    const movimientosFiltrados = this.filtrarMovimientosPorFecha(movimientosGlobales, filtros);
    const movimientosPaginados = [...movimientosFiltrados]
      .sort((a, b) => this.compararMovimientos(b, a))
      .slice((filtros.page - 1) * filtros.limit, filtros.page * filtros.limit);

    return {
      resumen: this.construirResumen(repartidor, movimientosGlobales),
      movimientos: movimientosPaginados,
      paginacion: {
        total: movimientosFiltrados.length,
        pagina: filtros.page,
        porPagina: filtros.limit,
        totalPaginas: Math.ceil(movimientosFiltrados.length / filtros.limit) || 1
      }
    };
  }

  async obtenerPagosPorRepartidor(repartidorId: number, filtros: FiltroCuentaCorriente) {
    await this.obtenerRepartidor(repartidorId);

    const pagos = await this.obtenerPagos(repartidorId, filtros);
    const total = pagos.length;
    const pagosPaginados = pagos.slice((filtros.page - 1) * filtros.limit, filtros.page * filtros.limit);

    return {
      pagos: pagosPaginados.map((pago) => ({
        id: pago.id,
        repartidor_id: pago.repartidor_id,
        repartidor_nombre: pago.repartidor_nombre,
        monto: redondearMonto(Number(pago.monto)),
        medio_pago: pago.medio_pago,
        observaciones: pago.observaciones || null,
        usuario_registro_id: pago.usuario_registro_id ?? null,
        fecha_pago: serializarFecha(pago.fecha_pago)
      })),
      paginacion: {
        total,
        pagina: filtros.page,
        porPagina: filtros.limit,
        totalPaginas: Math.ceil(total / filtros.limit) || 1
      }
    };
  }

  async obtenerRepartidoresDeudores() {
    const repartidores = await repartidorRepository.find({ 
      where: { activo: true },
      order: { nombre: 'ASC' }
    });

    const deudores = [];

    for (const repartidor of repartidores) {
      const cierres = await this.obtenerCierresConDeuda(repartidor.id);
      const pagos = await this.obtenerPagos(repartidor.id);
      const cobros = await this.obtenerCobrosRepartidor(repartidor.id);
      
      const movimientos = this.construirMovimientos(cierres, pagos.reverse(), cobros.reverse());
      const resumen = this.construirResumen(repartidor, movimientos);

      if (resumen.saldo_actual > 0) {
        deudores.push(resumen);
      }
    }

    return deudores.sort((a, b) => b.saldo_actual - a.saldo_actual);
  }
}
