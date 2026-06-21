import { AppDataSource } from '../config/database';
import { Venta } from '../entities/Venta';
import { Cobro } from '../entities/Cobro';
import { MovimientoEnvase, TipoMovimientoEnvase } from '../entities/MovimientoEnvase';
import { Clientes } from '../entities/Clientes';
import { EnvasesPrestados } from '../entities/EnvasesPrestados';
import { VisitaNoEncontrado } from '../entities/VisitaNoEncontrado';
import { RepartidorUbicacion } from '../entities/RepartidorUbicacion';
import { Repartidor } from '../entities/Repartidor';
import { MovimientoService } from './movimientoService';
import { VentaService } from './ventaService';

const MENSAJE_TABLA_COBROS_FALTANTE =
    'La tabla cobros no existe en la base de datos. Ejecuta la migración `migrations/crear_tabla_cobros.sql` o `migrations/crear_tablas_repartidor_rapido.sql`.';
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

export class RepartidorRapidoService {
    private ventaRepository = AppDataSource.getRepository(Venta);
    private cobroRepository = AppDataSource.getRepository(Cobro);
    private movimientoEnvaseRepository = AppDataSource.getRepository(MovimientoEnvase);
    private clienteRepository = AppDataSource.getRepository(Clientes);
    private envasesPrestadosRepository = AppDataSource.getRepository(EnvasesPrestados);
    private visitaNoEncontradoRepository = AppDataSource.getRepository(VisitaNoEncontrado);
    private repartidorUbicacionRepository = AppDataSource.getRepository(RepartidorUbicacion);
    private repartidorRepository = AppDataSource.getRepository(Repartidor);
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

            if (esErrorTablaFaltante(error, 'cobros')) {
                throw new Error(MENSAJE_TABLA_COBROS_FALTANTE);
            }

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

            // Registrar cobros con un tipo propio para no mezclarlos con ventas en métricas.
            await this.movimientoService.registrarCobroCliente(
                data.monto,
                cliente.nombre,
                {
                    cobro_id: cobroGuardado.id,
                    cliente_id: data.cliente_id,
                    repartidor_id: data.repartidor_id,
                    medio_pago: data.medio_pago,
                    venta_relacionada_id: data.venta_relacionada_id
                }
            );

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
     * Obtiene las visitas no encontradas (opcionalmente filtradas por cliente_id)
     */
    async obtenerVisitasNoEncontradas(cliente_id?: number) {
        const where = cliente_id ? { cliente_id } : {};
        return await this.visitaNoEncontradoRepository.find({
            where,
            relations: ['cliente', 'repartidor'],
            order: { fecha_registro: 'DESC' }
        });
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

    private coincideRepartidorNombre(clienteRepartidor: string, filtro: string): boolean {
        if (!filtro || filtro === 'todos') return true;
        if (!clienteRepartidor?.trim()) return false;
        if (
            filtro.toLowerCase().includes('david') &&
            clienteRepartidor.toLowerCase().includes('david')
        ) {
            return true;
        }
        return clienteRepartidor.trim().toLowerCase() === filtro.trim().toLowerCase();
    }

    /**
     * Obtiene los IDs de clientes atendidos hoy (venta, cobro, fiado, envases o visita registrada)
     */
    async obtenerClientesAtendidosHoy(repartidorNombre?: string): Promise<number[]> {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);

        const ids = new Set<number>();

        const ventas = await this.ventaRepository
            .createQueryBuilder('v')
            .select('v.cliente_id', 'cliente_id')
            .where('v.tipo = :tipo', { tipo: 'REPARTIDOR' })
            .andWhere('v.fecha_venta >= :hoy', { hoy })
            .andWhere('v.fecha_venta < :manana', { manana })
            .andWhere('v.cliente_id IS NOT NULL')
            .getRawMany();

        for (const row of ventas) {
            const id = parseInt(row.cliente_id, 10);
            if (!isNaN(id)) ids.add(id);
        }

        const cobros = await this.cobroRepository
            .createQueryBuilder('c')
            .select('c.cliente_id', 'cliente_id')
            .where('c.fecha_cobro >= :hoy', { hoy })
            .andWhere('c.fecha_cobro < :manana', { manana })
            .getRawMany();

        for (const row of cobros) {
            ids.add(Number(row.cliente_id));
        }

        const movimientos = await this.movimientoEnvaseRepository
            .createQueryBuilder('m')
            .select('m.cliente_id', 'cliente_id')
            .where('m.fecha_movimiento >= :hoy', { hoy })
            .andWhere('m.fecha_movimiento < :manana', { manana })
            .getRawMany();

        for (const row of movimientos) {
            ids.add(Number(row.cliente_id));
        }

        const visitas = await this.visitaNoEncontradoRepository
            .createQueryBuilder('vn')
            .select('vn.cliente_id', 'cliente_id')
            .where('vn.fecha_registro >= :hoy', { hoy })
            .andWhere('vn.fecha_registro < :manana', { manana })
            .getRawMany();

        for (const row of visitas) {
            ids.add(Number(row.cliente_id));
        }

        if (!repartidorNombre || repartidorNombre === 'todos') {
            return Array.from(ids);
        }

        if (ids.size === 0) {
            return [];
        }

        const clientes = await this.clienteRepository
            .createQueryBuilder('cliente')
            .select(['cliente.id', 'cliente.repartidor'])
            .where('cliente.id IN (:...ids)', { ids: Array.from(ids) })
            .getMany();

        return clientes
            .filter((c) => this.coincideRepartidorNombre(c.repartidor, repartidorNombre))
            .map((c) => c.id);
    }

    /**
     * Guarda o actualiza la ubicación GPS de un repartidor (upsert por repartidor_id)
     */
    async guardarUbicacionRepartidor(data: {
        repartidor_id: number;
        latitud: number;
        longitud: number;
    }): Promise<RepartidorUbicacion> {
        const repartidor = await this.repartidorRepository.findOne({
            where: { id: data.repartidor_id },
        });

        if (!repartidor) {
            throw new Error('Repartidor no encontrado');
        }

        const latitud = Number(data.latitud);
        const longitud = Number(data.longitud);

        if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
            throw new Error('Coordenadas inválidas');
        }

        if (latitud === 0 && longitud === 0) {
            throw new Error('Coordenadas inválidas');
        }

        let ubicacion = await this.repartidorUbicacionRepository.findOne({
            where: { repartidor_id: data.repartidor_id },
        });

        if (ubicacion) {
            ubicacion.latitud = latitud;
            ubicacion.longitud = longitud;
            ubicacion.repartidor_nombre = repartidor.nombre;
        } else {
            ubicacion = this.repartidorUbicacionRepository.create({
                repartidor_id: data.repartidor_id,
                repartidor_nombre: repartidor.nombre,
                latitud,
                longitud,
            });
        }

        return this.repartidorUbicacionRepository.save(ubicacion);
    }

    /**
     * Obtiene la última ubicación conocida de un repartidor por nombre
     */
    async obtenerUbicacionRepartidor(repartidorNombre: string): Promise<{
        repartidor_id: number;
        repartidor_nombre: string;
        latitud: number;
        longitud: number;
        actualizado_at: Date;
        en_linea: boolean;
    } | null> {
        if (!repartidorNombre?.trim()) {
            return null;
        }

        const ubicaciones = await this.repartidorUbicacionRepository.find();
        const ubicacion = ubicaciones.find((u) =>
            this.coincideRepartidorNombre(u.repartidor_nombre, repartidorNombre)
        );

        if (!ubicacion) {
            return null;
        }

        const actualizadoAt = new Date(ubicacion.actualizado_at);
        const minutosDesdeActualizacion =
            (Date.now() - actualizadoAt.getTime()) / (1000 * 60);
        const enLinea = minutosDesdeActualizacion <= 120;

        return {
            repartidor_id: ubicacion.repartidor_id,
            repartidor_nombre: ubicacion.repartidor_nombre,
            latitud: Number(ubicacion.latitud),
            longitud: Number(ubicacion.longitud),
            actualizado_at: actualizadoAt,
            en_linea: enLinea,
        };
    }
}
