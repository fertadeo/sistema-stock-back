import { AppDataSource } from '../config/database';
import { OperacionPendiente, TipoOperacion, EstadoSincronizacion } from '../entities/OperacionPendiente';
import { RepartidorRapidoService } from './repartidorRapidoService';
import { MovimientoEnvase, TipoMovimientoEnvase } from '../entities/MovimientoEnvase';

export class SincronizacionService {
    private operacionPendienteRepository = AppDataSource.getRepository(OperacionPendiente);
    private repartidorRapidoService = new RepartidorRapidoService();

    /**
     * Recibe y procesa operaciones pendientes desde el cliente
     */
    async recibirOperacionesPendientes(
        operaciones: Array<{
            operacion_id: string;
            tipo: TipoOperacion;
            datos_operacion: Record<string, any>;
            repartidor_id?: number;
            dispositivo_id?: string;
            fecha_operacion_local: string;
        }>
    ) {
        const resultados = [];

        for (const operacion of operaciones) {
            try {
                // Verificar si la operación ya existe (prevenir duplicados)
                const operacionExistente = await this.operacionPendienteRepository.findOne({
                    where: { operacion_id: operacion.operacion_id }
                });

                if (operacionExistente) {
                    if (operacionExistente.estado === EstadoSincronizacion.SINCRONIZADO) {
                        resultados.push({
                            operacion_id: operacion.operacion_id,
                            estado: 'duplicado',
                            mensaje: 'Operación ya sincronizada',
                            resultado_id: operacionExistente.resultado_id
                        });
                        continue;
                    }
                    // Si está pendiente o con error, intentar procesar de nuevo
                }

                // Crear o actualizar registro de operación pendiente
                let registroOperacion = operacionExistente || this.operacionPendienteRepository.create({
                    operacion_id: operacion.operacion_id,
                    tipo: operacion.tipo,
                    datos_operacion: operacion.datos_operacion,
                    repartidor_id: operacion.repartidor_id,
                    dispositivo_id: operacion.dispositivo_id,
                    fecha_operacion_local: new Date(operacion.fecha_operacion_local),
                    estado: EstadoSincronizacion.PENDIENTE
                });

                // Intentar procesar la operación
                const resultado = await this.procesarOperacion(operacion.tipo, operacion.datos_operacion);

                // Actualizar registro como sincronizado
                registroOperacion.estado = EstadoSincronizacion.SINCRONIZADO;
                registroOperacion.resultado_id = this.extraerIdResultado(resultado);
                registroOperacion.intentos_sincronizacion += 1;

                await this.operacionPendienteRepository.save(registroOperacion);

                resultados.push({
                    operacion_id: operacion.operacion_id,
                    estado: 'sincronizado',
                    mensaje: 'Operación procesada exitosamente',
                    resultado_id: registroOperacion.resultado_id,
                    datos: resultado
                });
            } catch (error) {
                // Guardar operación con estado de error
                let registroOperacion = await this.operacionPendienteRepository.findOne({
                    where: { operacion_id: operacion.operacion_id }
                });

                if (!registroOperacion) {
                    registroOperacion = this.operacionPendienteRepository.create({
                        operacion_id: operacion.operacion_id,
                        tipo: operacion.tipo,
                        datos_operacion: operacion.datos_operacion,
                        repartidor_id: operacion.repartidor_id,
                        dispositivo_id: operacion.dispositivo_id,
                        fecha_operacion_local: new Date(operacion.fecha_operacion_local),
                        estado: EstadoSincronizacion.ERROR
                    });
                } else {
                    registroOperacion.estado = EstadoSincronizacion.ERROR;
                }

                registroOperacion.error_mensaje = error instanceof Error ? error.message : 'Error desconocido';
                registroOperacion.intentos_sincronizacion += 1;

                await this.operacionPendienteRepository.save(registroOperacion);

                resultados.push({
                    operacion_id: operacion.operacion_id,
                    estado: 'error',
                    mensaje: error instanceof Error ? error.message : 'Error desconocido',
                    error: error instanceof Error ? error.message : 'Error desconocido'
                });
            }
        }

        return resultados;
    }

    /**
     * Procesa una operación según su tipo
     */
    private async procesarOperacion(tipo: TipoOperacion, datos: Record<string, any>) {
        switch (tipo) {
            case TipoOperacion.VENTA_RAPIDA:
                return await this.repartidorRapidoService.registrarVentaRapida(datos as {
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
                });

            case TipoOperacion.COBRO_RAPIDO:
                return await this.repartidorRapidoService.registrarCobroRapido(datos as {
                    cliente_id: number;
                    monto: number;
                    medio_pago: 'efectivo' | 'transferencia' | 'debito' | 'credito';
                    repartidor_id?: number;
                    observaciones?: string;
                    venta_relacionada_id?: string;
                });

            case TipoOperacion.FIADO_RAPIDO:
                return await this.repartidorRapidoService.registrarFiadoRapido(datos as {
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
                });

            case TipoOperacion.MOVIMIENTO_ENVASE:
                return await this.procesarMovimientoEnvase(datos as {
                    cliente_id: number;
                    producto_id: number;
                    cantidad: number;
                    tipo: TipoMovimientoEnvase;
                    repartidor_id?: number;
                    observaciones?: string;
                });

            default:
                throw new Error(`Tipo de operación no soportado: ${tipo}`);
        }
    }

    /**
     * Procesa un movimiento de envase independiente
     */
    private async procesarMovimientoEnvase(datos: {
        cliente_id: number;
        producto_id: number;
        cantidad: number;
        tipo: TipoMovimientoEnvase;
        repartidor_id?: number;
        observaciones?: string;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { Productos } = await import('../entities/Productos');
            const producto = await queryRunner.manager.findOne(Productos, {
                where: { id: datos.producto_id }
            });

            if (!producto) {
                throw new Error(`Producto con ID ${datos.producto_id} no encontrado`);
            }

            const movimientoEnvase = queryRunner.manager.create(MovimientoEnvase, {
                cliente_id: datos.cliente_id,
                producto_id: datos.producto_id,
                producto_nombre: producto.nombreProducto,
                capacidad: this.extraerCapacidad(producto.nombreProducto),
                cantidad: datos.tipo === TipoMovimientoEnvase.DEVOLUCION ? -datos.cantidad : datos.cantidad,
                tipo: datos.tipo,
                repartidor_id: datos.repartidor_id,
                observaciones: datos.observaciones
            });

            const resultado = await queryRunner.manager.save(movimientoEnvase);

            // Actualizar envases prestados
            const { EnvasesPrestados } = await import('../entities/EnvasesPrestados');
            if (datos.tipo === TipoMovimientoEnvase.PRESTAMO) {
                const envaseExistente = await queryRunner.manager.findOne(EnvasesPrestados, {
                    where: {
                        cliente_id: datos.cliente_id,
                        producto_id: datos.producto_id
                    }
                });

                if (envaseExistente) {
                    envaseExistente.cantidad += datos.cantidad;
                    await queryRunner.manager.save(envaseExistente);
                } else {
                    const nuevoEnvase = queryRunner.manager.create(EnvasesPrestados, {
                        cliente_id: datos.cliente_id,
                        producto_id: datos.producto_id,
                        producto_nombre: producto.nombreProducto,
                        capacidad: this.extraerCapacidad(producto.nombreProducto),
                        cantidad: datos.cantidad
                    });
                    await queryRunner.manager.save(nuevoEnvase);
                }
            } else if (datos.tipo === TipoMovimientoEnvase.DEVOLUCION) {
                const envaseExistente = await queryRunner.manager.findOne(EnvasesPrestados, {
                    where: {
                        cliente_id: datos.cliente_id,
                        producto_id: datos.producto_id
                    }
                });

                if (envaseExistente) {
                    envaseExistente.cantidad = Math.max(0, envaseExistente.cantidad - datos.cantidad);
                    if (envaseExistente.cantidad === 0) {
                        await queryRunner.manager.remove(envaseExistente);
                    } else {
                        await queryRunner.manager.save(envaseExistente);
                    }
                }
            }

            await queryRunner.commitTransaction();
            return resultado;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
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
        if (nombreProducto.includes('1500')) return 1.5;
        if (nombreProducto.includes('1250')) return 1.25;
        if (nombreProducto.includes('1000')) return 1;
        if (nombreProducto.includes('20')) return 20;
        if (nombreProducto.includes('12')) return 12;
        return 0;
    }

    /**
     * Extrae el ID del resultado de diferentes tipos de operaciones
     */
    private extraerIdResultado(resultado: any): string {
        // Cobro tiene id (number)
        if (resultado && typeof resultado.id === 'number') {
            return resultado.id.toString();
        }
        
        // MovimientoEnvase tiene id (number)
        if (resultado && typeof resultado.id === 'number') {
            return resultado.id.toString();
        }
        
        // Venta tiene venta_id (string)
        if (resultado && typeof resultado.venta_id === 'string') {
            return resultado.venta_id;
        }
        
        // Resultado de venta rápida tiene venta.venta_id
        if (resultado && resultado.venta && typeof resultado.venta.venta_id === 'string') {
            return resultado.venta.venta_id;
        }
        
        return '';
    }

    /**
     * Obtiene el estado de sincronización de operaciones pendientes
     */
    async obtenerEstadoSincronizacion(repartidor_id?: number, dispositivo_id?: string) {
        const where: any = {};
        if (repartidor_id) {
            where.repartidor_id = repartidor_id;
        }
        if (dispositivo_id) {
            where.dispositivo_id = dispositivo_id;
        }

        const operaciones = await this.operacionPendienteRepository.find({
            where,
            order: { fecha_creacion: 'DESC' },
            take: 100 // Últimas 100 operaciones
        });

        const resumen = {
            total: operaciones.length,
            pendientes: operaciones.filter(o => o.estado === EstadoSincronizacion.PENDIENTE).length,
            sincronizadas: operaciones.filter(o => o.estado === EstadoSincronizacion.SINCRONIZADO).length,
            errores: operaciones.filter(o => o.estado === EstadoSincronizacion.ERROR).length,
            duplicadas: operaciones.filter(o => o.estado === EstadoSincronizacion.DUPLICADO).length,
            operaciones: operaciones.map(op => ({
                operacion_id: op.operacion_id,
                tipo: op.tipo,
                estado: op.estado,
                fecha_operacion_local: op.fecha_operacion_local,
                fecha_creacion: op.fecha_creacion,
                resultado_id: op.resultado_id,
                error_mensaje: op.error_mensaje,
                intentos: op.intentos_sincronizacion
            }))
        };

        return resumen;
    }

    /**
     * Reintenta sincronizar operaciones con error
     */
    async reintentarOperacionesConError(repartidor_id?: number, dispositivo_id?: string, maxIntentos: number = 5) {
        const where: any = {
            estado: EstadoSincronizacion.ERROR
        };
        if (repartidor_id) {
            where.repartidor_id = repartidor_id;
        }
        if (dispositivo_id) {
            where.dispositivo_id = dispositivo_id;
        }

        const operacionesConError = await this.operacionPendienteRepository.find({
            where,
            order: { fecha_creacion: 'ASC' }
        });

        const resultados = [];

        for (const operacion of operacionesConError) {
            if (operacion.intentos_sincronizacion >= maxIntentos) {
                resultados.push({
                    operacion_id: operacion.operacion_id,
                    estado: 'max_intentos',
                    mensaje: 'Máximo de intentos alcanzado'
                });
                continue;
            }

            try {
                const resultado = await this.procesarOperacion(operacion.tipo, operacion.datos_operacion);

                operacion.estado = EstadoSincronizacion.SINCRONIZADO;
                operacion.resultado_id = this.extraerIdResultado(resultado);
                operacion.error_mensaje = '';
                operacion.intentos_sincronizacion += 1;

                await this.operacionPendienteRepository.save(operacion);

                resultados.push({
                    operacion_id: operacion.operacion_id,
                    estado: 'sincronizado',
                    mensaje: 'Operación sincronizada exitosamente'
                });
            } catch (error) {
                operacion.intentos_sincronizacion += 1;
                operacion.error_mensaje = error instanceof Error ? error.message : 'Error desconocido';
                await this.operacionPendienteRepository.save(operacion);

                resultados.push({
                    operacion_id: operacion.operacion_id,
                    estado: 'error',
                    mensaje: error instanceof Error ? error.message : 'Error desconocido'
                });
            }
        }

        return resultados;
    }
}
