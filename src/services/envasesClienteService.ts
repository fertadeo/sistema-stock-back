import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { EnvasesPrestados } from '../entities/EnvasesPrestados';
import { MovimientoEnvase, TipoMovimientoEnvase } from '../entities/MovimientoEnvase';
import { Productos } from '../entities/Productos';

interface Paginacion {
  page: number;
  limit: number;
}

interface RegistrarMovimientoEnvaseInput {
  cliente_id: number;
  tipo: TipoMovimientoEnvase;
  items: Array<{
    producto_id: number;
    cantidad: number;
  }>;
  observaciones?: string;
  repartidor_id?: number | null;
  venta_relacionada_id?: string | null;
}

const clienteRepository = AppDataSource.getRepository(Clientes);
const productoRepository = AppDataSource.getRepository(Productos);
const envasesPrestadosRepository = AppDataSource.getRepository(EnvasesPrestados);
const movimientoEnvaseRepository = AppDataSource.getRepository(MovimientoEnvase);

const serializarFecha = (fecha: Date | string): string => new Date(fecha).toISOString();

export class EnvasesClienteService {
  private extraerCapacidad(nombreProducto: string): number {
    const match = nombreProducto.match(/(\d+(?:[.,]\d+)?)L/i);
    if (match) {
      return Number(match[1].replace(',', '.'));
    }

    if (nombreProducto.includes('1500')) return 1.5;
    if (nombreProducto.includes('1250')) return 1.25;
    if (nombreProducto.includes('1000')) return 1;
    if (nombreProducto.includes('20')) return 20;
    if (nombreProducto.includes('12')) return 12;
    return 0;
  }

  private async asegurarClienteExiste(clienteId: number): Promise<void> {
    const cliente = await clienteRepository.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
  }

  private agruparSaldoActual(registros: EnvasesPrestados[]) {
    const agrupados = new Map<number, {
      producto_id: number;
      producto_nombre: string;
      capacidad: number;
      cantidad: number;
    }>();

    for (const registro of registros) {
      const existente = agrupados.get(registro.producto_id);
      if (existente) {
        existente.cantidad += Number(registro.cantidad);
      } else {
        agrupados.set(registro.producto_id, {
          producto_id: registro.producto_id,
          producto_nombre: registro.producto_nombre,
          capacidad: Number(registro.capacidad),
          cantidad: Number(registro.cantidad)
        });
      }
    }

    return Array.from(agrupados.values())
      .filter((item) => item.cantidad > 0)
      .sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre));
  }

  async obtenerResumenPorCliente(clienteId: number) {
    await this.asegurarClienteExiste(clienteId);

    const [registros, ultimoMovimiento] = await Promise.all([
      envasesPrestadosRepository.find({
        where: { cliente_id: clienteId },
        order: { fecha_prestamo: 'DESC' }
      }),
      movimientoEnvaseRepository.findOne({
        where: { cliente_id: clienteId },
        order: { fecha_movimiento: 'DESC' }
      })
    ]);

    const saldoActual = this.agruparSaldoActual(registros);
    const cantidadTotal = saldoActual.reduce((total, item) => total + item.cantidad, 0);

    return {
      cliente_id: clienteId,
      saldo_actual: saldoActual,
      cantidad_total: cantidadTotal,
      ultimo_movimiento_at: ultimoMovimiento ? serializarFecha(ultimoMovimiento.fecha_movimiento) : null
    };
  }

  async obtenerMovimientosPorCliente(
    clienteId: number,
    filtros: Paginacion & { tipo?: TipoMovimientoEnvase }
  ) {
    await this.asegurarClienteExiste(clienteId);

    const where = filtros.tipo
      ? { cliente_id: clienteId, tipo: filtros.tipo }
      : { cliente_id: clienteId };

    const [movimientos, total] = await movimientoEnvaseRepository.findAndCount({
      where,
      order: { fecha_movimiento: 'DESC' },
      skip: (filtros.page - 1) * filtros.limit,
      take: filtros.limit
    });

    return {
      movimientos: movimientos.map((movimiento) => ({
        id: movimiento.id,
        cliente_id: movimiento.cliente_id,
        producto_id: movimiento.producto_id,
        producto_nombre: movimiento.producto_nombre,
        capacidad: Number(movimiento.capacidad),
        tipo: movimiento.tipo,
        cantidad: Number(movimiento.cantidad),
        observaciones: movimiento.observaciones || null,
        repartidor_id: movimiento.repartidor_id ?? null,
        venta_relacionada_id: movimiento.venta_relacionada_id || null,
        fecha_movimiento: serializarFecha(movimiento.fecha_movimiento)
      })),
      paginacion: {
        total,
        pagina: filtros.page,
        porPagina: filtros.limit,
        totalPaginas: Math.ceil(total / filtros.limit) || 1
      }
    };
  }

  async registrarMovimientoCliente(input: RegistrarMovimientoEnvaseInput) {
    if (!input.items.length) {
      throw new Error('Debe enviar al menos un item');
    }

    if (input.tipo === TipoMovimientoEnvase.AJUSTE && !input.observaciones?.trim()) {
      throw new Error('Los ajustes requieren observaciones');
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cliente = await queryRunner.manager.findOne(Clientes, {
        where: { id: input.cliente_id }
      });

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const movimientosCreados: Array<{ id: number; tipo: TipoMovimientoEnvase; cantidad: number }> = [];

      for (const item of input.items) {
        const cantidad = Number(item.cantidad);
        if (Number.isNaN(cantidad) || cantidad === 0) {
          throw new Error(`Cantidad inválida para producto ${item.producto_id}`);
        }

        if (input.tipo !== TipoMovimientoEnvase.AJUSTE && cantidad < 0) {
          throw new Error(`La cantidad debe ser positiva para producto ${item.producto_id}`);
        }

        const producto = await queryRunner.manager.findOne(Productos, {
          where: { id: item.producto_id }
        });

        if (!producto) {
          throw new Error(`Producto con ID ${item.producto_id} no encontrado`);
        }

        const registrosExistentes = await queryRunner.manager.find(EnvasesPrestados, {
          where: {
            cliente_id: input.cliente_id,
            producto_id: item.producto_id
          }
        });

        const cantidadActual = registrosExistentes.reduce(
          (total, registro) => total + Number(registro.cantidad),
          0
        );

        const delta =
          input.tipo === TipoMovimientoEnvase.PRESTAMO
            ? cantidad
            : input.tipo === TipoMovimientoEnvase.DEVOLUCION
              ? -cantidad
              : cantidad;

        const cantidadNueva = cantidadActual + delta;

        if (cantidadNueva < 0) {
          throw new Error(
            `La operación deja saldo negativo de envases para el producto ${producto.nombreProducto}`
          );
        }

        if (registrosExistentes.length > 0) {
          await queryRunner.manager.remove(registrosExistentes);
        }

        if (cantidadNueva > 0) {
          const snapshot = queryRunner.manager.create(EnvasesPrestados, {
            cliente_id: input.cliente_id,
            producto_id: item.producto_id,
            producto_nombre: producto.nombreProducto,
            capacidad: this.extraerCapacidad(producto.nombreProducto),
            cantidad: cantidadNueva
          });

          await queryRunner.manager.save(snapshot);
        }

        const movimiento = queryRunner.manager.create(MovimientoEnvase, {
          cliente_id: input.cliente_id,
          producto_id: item.producto_id,
          producto_nombre: producto.nombreProducto,
          capacidad: this.extraerCapacidad(producto.nombreProducto),
          cantidad: delta,
          tipo: input.tipo,
          repartidor_id: input.repartidor_id ?? undefined,
          observaciones: input.observaciones,
          venta_relacionada_id: input.venta_relacionada_id ?? undefined
        });

        const movimientoGuardado = await queryRunner.manager.save(movimiento);
        movimientosCreados.push({
          id: movimientoGuardado.id,
          tipo: movimientoGuardado.tipo,
          cantidad: Number(movimientoGuardado.cantidad)
        });
      }

      await queryRunner.commitTransaction();

      const resumen = await this.obtenerResumenPorCliente(input.cliente_id);

      return {
        saldo_actual: resumen.saldo_actual,
        cantidad_total: resumen.cantidad_total,
        ultimo_movimiento_at: resumen.ultimo_movimiento_at,
        movimientos_creados: movimientosCreados
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
