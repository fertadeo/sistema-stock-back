import { AppDataSource } from '../config/database';
import { Movimiento, TipoMovimiento } from '../entities/Movimiento';
import { eventService } from './eventService';

export class MovimientoService {
    private movimientoRepository = AppDataSource.getRepository(Movimiento);

    async registrarMovimiento(data: {
        tipo: TipoMovimiento;
        descripcion: string;
        monto?: number;
        detalles?: Record<string, any>;
    }): Promise<Movimiento> {
        const movimiento = this.movimientoRepository.create({
            ...data,
            usuario_id: 1 // Por ahora usamos un usuario por defecto
        });

        const movimientoGuardado = await this.movimientoRepository.save(movimiento);

        // Notificar a todos los clientes conectados sobre el nuevo movimiento
        eventService.broadcastEvent('nuevo_movimiento', movimientoGuardado);

        return movimientoGuardado;
    }

    // Métodos específicos para cada tipo de movimiento
    async registrarNuevoCliente(nombreCliente: string, detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.NUEVO_CLIENTE,
            descripcion: `Nuevo cliente registrado: ${nombreCliente}`,
            detalles
        });
    }

    async registrarVentaLocal(monto: number, productos: string[], detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.VENTA_LOCAL,
            descripcion: `Venta en local por $${monto}`,
            monto,
            detalles: {
                productos,
                ...detalles
            }
        });
    }

    async registrarGasto(monto: number, concepto: string, detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.GASTO,
            descripcion: `Gasto: ${concepto}`,
            monto: -monto, // Los gastos se registran como negativos
            detalles
        });
    }

    async registrarModificacionProducto(nombreProducto: string, cambios: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.MODIFICACION_PRODUCTO,
            descripcion: `Modificación de producto: ${nombreProducto}`,
            detalles: { cambios }
        });
    }

    async registrarCierreVenta(monto: number, repartidor: string, detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.CIERRE_VENTA,
            descripcion: `Cierre de venta - Repartidor: ${repartidor}`,
            monto,
            detalles
        });
    }

    async registrarRendicion(monto: number, repartidor: string, detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.RENDICION,
            descripcion: `Rendición - Repartidor: ${repartidor}`,
            monto,
            detalles
        });
    }

    async registrarVentaRepartidor(monto: number, productos: string[], detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.CIERRE_VENTA,
            descripcion: `Cierre de venta por repartidor - Total: $${monto}`,
            monto,
            detalles: {
                productos,
                ...detalles
            }
        });
    }

    async obtenerMovimientos(where: any, page: number, limit: number) {
        return this.movimientoRepository.findAndCount({
            where,
            order: { fecha: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        });
    }

    async obtenerMovimientoPorId(id: number) {
        return this.movimientoRepository.findOne({
            where: { id, activo: true }
        });
    }
} 