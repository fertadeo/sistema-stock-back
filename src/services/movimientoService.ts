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

    async registrarCobroCliente(monto: number, nombreCliente: string, detalles?: Record<string, any>): Promise<Movimiento> {
        return this.registrarMovimiento({
            tipo: TipoMovimiento.COBRO_CLIENTE,
            descripcion: `Cobro a ${nombreCliente} por $${monto}`,
            monto,
            detalles
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

    /** Desactiva movimientos CIERRE_VENTA vinculados a una venta cerrada (soft delete contable). */
    async desactivarPorVentaCerradaId(ventaCerradaId: number): Promise<number> {
        const movimientos = await this.movimientoRepository
            .createQueryBuilder('mov')
            .where('mov.tipo = :tipo', { tipo: TipoMovimiento.CIERRE_VENTA })
            .andWhere('mov.activo = :activo', { activo: true })
            .andWhere("JSON_EXTRACT(mov.detalles, '$.venta_cerrada_id') = :id", { id: ventaCerradaId })
            .getMany();

        if (movimientos.length === 0) {
            return 0;
        }

        for (const movimiento of movimientos) {
            movimiento.activo = false;
        }

        await this.movimientoRepository.save(movimientos);
        return movimientos.length;
    }

    /** Reactiva movimientos CIERRE_VENTA al restaurar una venta cerrada. */
    async reactivarPorVentaCerradaId(ventaCerradaId: number): Promise<number> {
        const movimientos = await this.movimientoRepository
            .createQueryBuilder('mov')
            .where('mov.tipo = :tipo', { tipo: TipoMovimiento.CIERRE_VENTA })
            .andWhere('mov.activo = :activo', { activo: false })
            .andWhere("JSON_EXTRACT(mov.detalles, '$.venta_cerrada_id') = :id", { id: ventaCerradaId })
            .getMany();

        if (movimientos.length === 0) {
            return 0;
        }

        for (const movimiento of movimientos) {
            movimiento.activo = true;
        }

        await this.movimientoRepository.save(movimientos);
        return movimientos.length;
    }

    /** Actualizar un gasto */
    async actualizarGasto(
        id: number,
        monto?: number,
        concepto?: string,
        detalles?: Record<string, any>
    ): Promise<Movimiento> {
        const gasto = await this.movimientoRepository.findOne({
            where: { id, tipo: TipoMovimiento.GASTO, activo: true }
        });

        if (!gasto) {
            throw new Error('Gasto no encontrado');
        }

        // Actualizar solo los campos proporcionados
        if (monto !== undefined) {
            gasto.monto = -monto; // Los gastos se registran como negativos
        }

        if (concepto !== undefined) {
            gasto.descripcion = `Gasto: ${concepto}`;
        }

        if (detalles !== undefined) {
            gasto.detalles = {
                ...gasto.detalles,
                ...detalles
            };
        }

        const gastoActualizado = await this.movimientoRepository.save(gasto);

        // Notificar actualización
        eventService.broadcastEvent('movimiento_actualizado', gastoActualizado);

        return gastoActualizado;
    }

    /** Eliminar un gasto (soft delete) */
    async eliminarGasto(id: number): Promise<void> {
        const gasto = await this.movimientoRepository.findOne({
            where: { id, tipo: TipoMovimiento.GASTO, activo: true }
        });

        if (!gasto) {
            throw new Error('Gasto no encontrado');
        }

        gasto.activo = false;
        await this.movimientoRepository.save(gasto);

        // Notificar eliminación
        eventService.broadcastEvent('movimiento_eliminado', { id });
    }
} 