import { AppDataSource } from '../config/database';
import { Venta } from '../entities/Venta';
import { Cobro } from '../entities/Cobro';
import { MovimientoEnvase, TipoMovimientoEnvase } from '../entities/MovimientoEnvase';
import { Clientes } from '../entities/Clientes';
import { EnvasesPrestados } from '../entities/EnvasesPrestados';
import { VisitaNoEncontrado } from '../entities/VisitaNoEncontrado';
import { MovimientoService } from './movimientoService';
import { VentaService } from './ventaService';

export class RepartidorRapidoService {
    private ventaRepository = AppDataSource.getRepository(Venta);
    private cobroRepository = AppDataSource.getRepository(Cobro);
    private movimientoEnvaseRepository = AppDataSource.getRepository(MovimientoEnvase);
    private clienteRepository = AppDataSource.getRepository(Clientes);
    private envasesPrestadosRepository = AppDataSource.getRepository(EnvasesPrestados);
    private visitaNoEncontradoRepository = AppDataSource.getRepository(VisitaNoEncontrado);
    private ventaService = new VentaService();
    private movimientoService = new MovimientoService();

    /**
     * Registra una venta rápida con opción de fiado y registro de envases
     */
    async registrarVentaRapida(data: {
        cliente_id: number;
        productos: Array<{
            producto_id: string;
            cantidad: number;
            precio_unitario: number;
            nombre?: string;
        }>;
        monto_total: number;
        medio_pago: 'efectivo' | 'transferencia' | 'debito' | 'credito';
        forma_pago: 'total' | 'parcial';
        saldo_monto?: number;
        repartidor_id?: number;
        envases_prestados?: Array<{
            producto_id: number;
            cantidad: number;
        }>;
        envases_devueltos?: Array<{
            producto_id: number;
            cantidad: number;
        }>;
        observaciones?: string;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Verificar que el cliente existe y está activo
            const cliente = await queryRunner.manager.findOne(Clientes, {
                where: { id: data.cliente_id }
            });

            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }

            if (!cliente.estado) {
                throw new Error('El cliente está desactivado');
            }

            // Crear la venta dentro de la transacción
            const ventaData: Partial<Venta> = {
                tipo: 'REPARTIDOR',
                cliente_id: data.cliente_id.toString(),
                nombre_cliente: cliente.nombre,
                telefono_cliente: cliente.telefono || '',
                productos: data.productos.map(p => ({
                    producto_id: p.producto_id,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario.toString(),
                    subtotal: (p.cantidad * p.precio_unitario).toString()
                })),
                monto_total: data.monto_total.toString(),
                medio_pago: data.medio_pago,
                forma_pago: data.forma_pago,
                saldo: data.forma_pago === 'parcial',
                saldo_monto: data.saldo_monto?.toString(),
                repartidor_id: data.repartidor_id?.toString(),
                observaciones: data.observaciones
            };

            const venta = queryRunner.manager.create(Venta, ventaData);
            const ventaGuardada = await queryRunner.manager.save(venta);

            // Registrar movimientos de envases si existen
            if (data.envases_prestados && data.envases_prestados.length > 0) {
                await this.registrarMovimientosEnvases(
                    queryRunner,
                    data.cliente_id,
                    data.envases_prestados,
                    TipoMovimientoEnvase.PRESTAMO,
                    data.repartidor_id,
                    ventaGuardada.venta_id
                );
            }

            if (data.envases_devueltos && data.envases_devueltos.length > 0) {
                await this.registrarMovimientosEnvases(
                    queryRunner,
                    data.cliente_id,
                    data.envases_devueltos,
                    TipoMovimientoEnvase.DEVOLUCION,
                    data.repartidor_id,
                    ventaGuardada.venta_id
                );
            }

            await queryRunner.commitTransaction();

            // Registrar movimiento en el sistema de auditoría (fuera de la transacción principal)
            // para evitar problemas con el servicio de eventos
            try {
                await this.movimientoService.registrarMovimiento({
                    tipo: 'VENTA_LOCAL' as any, // Usar tipo existente
                    descripcion: `Venta rápida a ${cliente.nombre} por $${data.monto_total}`,
                    monto: data.monto_total,
                    detalles: {
                        venta_id: ventaGuardada.venta_id,
                        cliente_id: data.cliente_id,
                        repartidor_id: data.repartidor_id,
                        productos: data.productos,
                        medio_pago: data.medio_pago,
                        forma_pago: data.forma_pago
                    }
                });
            } catch (error) {
                console.error('Error al registrar movimiento de auditoría:', error);
                // No lanzamos el error para no afectar la venta ya guardada
            }

            return {
                venta: ventaGuardada,
                cliente,
                envases_prestados: data.envases_prestados || [],
                envases_devueltos: data.envases_devueltos || []
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Registra un cobro rápido a un cliente
     */
    async registrarCobroRapido(data: {
        cliente_id: number;
        monto: number;
        medio_pago: 'efectivo' | 'transferencia' | 'debito' | 'credito';
        repartidor_id?: number;
        observaciones?: string;
        venta_relacionada_id?: string;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Verificar que el cliente existe
            const cliente = await queryRunner.manager.findOne(Clientes, {
                where: { id: data.cliente_id }
            });

            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }

            // Crear el cobro
            const cobro = queryRunner.manager.create(Cobro, {
                cliente_id: data.cliente_id,
                nombre_cliente: cliente.nombre,
                monto: data.monto,
                medio_pago: data.medio_pago,
                repartidor_id: data.repartidor_id,
                observaciones: data.observaciones,
                venta_relacionada_id: data.venta_relacionada_id
            });

            const cobroGuardado = await queryRunner.manager.save(cobro);

            // Registrar movimiento en el sistema de auditoría
            await this.movimientoService.registrarMovimiento({
                tipo: 'VENTA_LOCAL' as any,
                descripcion: `Cobro a ${cliente.nombre} por $${data.monto}`,
                monto: data.monto,
                detalles: {
                    cobro_id: cobroGuardado.id,
                    cliente_id: data.cliente_id,
                    repartidor_id: data.repartidor_id,
                    medio_pago: data.medio_pago,
                    venta_relacionada_id: data.venta_relacionada_id
                }
            });

            await queryRunner.commitTransaction();

            return cobroGuardado;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Registra un fiado (venta sin pago inmediato)
     */
    async registrarFiadoRapido(data: {
        cliente_id: number;
        productos: Array<{
            producto_id: string;
            cantidad: number;
            precio_unitario: number;
            nombre?: string;
        }>;
        monto_total: number;
        repartidor_id?: number;
        envases_prestados?: Array<{
            producto_id: number;
            cantidad: number;
        }>;
        observaciones?: string;
    }) {
        return await this.registrarVentaRapida({
            ...data,
            medio_pago: 'credito',
            forma_pago: 'parcial',
            saldo_monto: data.monto_total
        });
    }

    /**
     * Registra movimientos de envases (préstamos o devoluciones)
     */
    private async registrarMovimientosEnvases(
        queryRunner: any,
        cliente_id: number,
        envases: Array<{ producto_id: number; cantidad: number }>,
        tipo: TipoMovimientoEnvase,
        repartidor_id?: number,
        venta_id?: string
    ) {
        const cliente = await queryRunner.manager.findOne(Clientes, {
            where: { id: cliente_id },
            relations: ['envases_prestados']
        });

        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        const Productos = (await import('../entities/Productos')).Productos;

        for (const envase of envases) {
            const producto = await queryRunner.manager.findOne(Productos, {
                where: { id: envase.producto_id }
            });

            if (!producto) {
                throw new Error(`Producto con ID ${envase.producto_id} no encontrado`);
            }

            // Crear movimiento de envase
            const movimientoEnvase = queryRunner.manager.create(MovimientoEnvase, {
                cliente_id,
                producto_id: envase.producto_id,
                producto_nombre: producto.nombreProducto,
                capacidad: this.extraerCapacidad(producto.nombreProducto),
                cantidad: tipo === TipoMovimientoEnvase.DEVOLUCION ? -envase.cantidad : envase.cantidad,
                tipo,
                repartidor_id,
                venta_relacionada_id: venta_id
            });

            await queryRunner.manager.save(movimientoEnvase);

            // Actualizar o crear registro en envases prestados
            if (tipo === TipoMovimientoEnvase.PRESTAMO) {
                const envaseExistente = await queryRunner.manager.findOne(EnvasesPrestados, {
                    where: {
                        cliente_id,
                        producto_id: envase.producto_id
                    }
                });

                if (envaseExistente) {
                    envaseExistente.cantidad += envase.cantidad;
                    await queryRunner.manager.save(envaseExistente);
                } else {
                    const nuevoEnvase = queryRunner.manager.create(EnvasesPrestados, {
                        cliente_id,
                        producto_id: envase.producto_id,
                        producto_nombre: producto.nombreProducto,
                        capacidad: this.extraerCapacidad(producto.nombreProducto),
                        cantidad: envase.cantidad
                    });
                    await queryRunner.manager.save(nuevoEnvase);
                }
            } else if (tipo === TipoMovimientoEnvase.DEVOLUCION) {
                const envaseExistente = await queryRunner.manager.findOne(EnvasesPrestados, {
                    where: {
                        cliente_id,
                        producto_id: envase.producto_id
                    }
                });

                if (envaseExistente) {
                    envaseExistente.cantidad = Math.max(0, envaseExistente.cantidad - envase.cantidad);
                    if (envaseExistente.cantidad === 0) {
                        await queryRunner.manager.remove(envaseExistente);
                    } else {
                        await queryRunner.manager.save(envaseExistente);
                    }
                }
            }
        }
    }

    /**
     * Extrae la capacidad en litros del nombre del producto
     */
    private extraerCapacidad(nombreProducto: string): number {
        const match = nombreProducto.match(/(\d+)L/i);
        if (match) {
            return parseInt(match[1]);
        }
        // Valores por defecto según el nombre
        if (nombreProducto.includes('1500')) return 1.5;
        if (nombreProducto.includes('1250')) return 1.25;
        if (nombreProducto.includes('1000')) return 1;
        if (nombreProducto.includes('20')) return 20;
        if (nombreProducto.includes('12')) return 12;
        return 0;
    }

    /**
     * Registra que el repartidor no encontró al cliente en la visita
     */
    async registrarNoEncontrado(data: {
        cliente_id: number;
        repartidor_id?: number;
        observaciones?: string;
        fecha?: string; // ISO string
    }) {
        const cliente = await this.clienteRepository.findOne({
            where: { id: data.cliente_id }
        });

        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        const visita = this.visitaNoEncontradoRepository.create({
            cliente_id: data.cliente_id,
            repartidor_id: data.repartidor_id,
            observaciones: data.observaciones || 'Cliente no encontrado en la visita',
            fecha_visita: data.fecha ? new Date(data.fecha) : new Date()
        });

        return await this.visitaNoEncontradoRepository.save(visita);
    }

    /**
     * Obtiene el resumen de envases de un cliente
     */
    async obtenerResumenEnvases(cliente_id: number) {
        const envasesPrestados = await this.envasesPrestadosRepository.find({
            where: { cliente_id },
            relations: ['producto']
        });

        const movimientos = await this.movimientoEnvaseRepository.find({
            where: { cliente_id },
            order: { fecha_movimiento: 'DESC' },
            take: 50 // Últimos 50 movimientos
        });

        return {
            envases_prestados: envasesPrestados,
            historial_movimientos: movimientos
        };
    }
}
