import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Movimiento, TipoMovimiento } from '../entities/Movimiento';
import { Between, Like } from 'typeorm';
import { eventService } from '../services/eventService';

const movimientoRepository = AppDataSource.getRepository(Movimiento);

export const movimientoController = {
    // Crear un nuevo movimiento
    crear: async (req: Request, res: Response) => {
        try {
            const { tipo, descripcion, monto, detalles } = req.body;

            const movimiento = movimientoRepository.create({
                tipo,
                descripcion,
                monto,
                detalles,
                usuario_id: 1 // Usuario por defecto
            });

            await movimientoRepository.save(movimiento);

            res.status(201).json({
                success: true,
                message: 'Movimiento registrado exitosamente',
                movimiento
            });
        } catch (error) {
            console.error('Error al crear movimiento:', error);
            res.status(500).json({
                success: false,
                message: 'Error al registrar el movimiento',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Obtener todos los movimientos con filtros
    obtenerTodos: async (req: Request, res: Response) => {
        try {
            const {
                fechaInicio,
                fechaFin,
                tipo,
                usuario_id,
                descripcion,
                page = 1,
                limit = 10
            } = req.query;

            const where: any = { activo: true };

            // Aplicar filtros si existen
            if (fechaInicio && fechaFin) {
                where.fecha = Between(new Date(fechaInicio as string), new Date(fechaFin as string));
            }

            if (tipo) {
                where.tipo = tipo;
            }

            if (usuario_id) {
                where.usuario_id = usuario_id;
            }

            if (descripcion) {
                where.descripcion = Like(`%${descripcion}%`);
            }

            const [movimientos, total] = await movimientoRepository.findAndCount({
                where,
                relations: ['usuario'],
                order: { fecha: 'DESC' },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit)
            });

            res.json({
                success: true,
                movimientos,
                paginacion: {
                    total,
                    pagina: Number(page),
                    porPagina: Number(limit),
                    totalPaginas: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            console.error('Error al obtener movimientos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los movimientos',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Obtener movimientos por cliente (detalles JSON contiene cliente_id)
    obtenerPorCliente: async (req: Request, res: Response) => {
        try {
            const clienteId = parseInt(req.params.clienteId);

            if (isNaN(clienteId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de cliente inválido'
                });
            }

            const movimientosRaw = await movimientoRepository.find({
                where: { activo: true },
                relations: ['usuario'],
                order: { fecha: 'DESC' },
                take: 500
            });

            const movimientos = movimientosRaw
                .filter((m) => {
                    const det = m.detalles as Record<string, unknown> | null;
                    if (!det || !('cliente_id' in det)) return false;
                    const cid = det.cliente_id;
                    return cid === clienteId || String(cid) === String(clienteId);
                })
                .slice(0, 100);

            res.json({
                success: true,
                movimientos
            });
        } catch (error) {
            console.error('Error al obtener movimientos por cliente:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los movimientos del cliente',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Obtener un movimiento específico
    obtenerPorId: async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            
            // Validar que el ID sea un número válido
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de movimiento inválido',
                    error: 'El ID debe ser un número'
                });
            }

            const movimiento = await movimientoRepository.findOne({
                where: { id, activo: true },
                relations: ['usuario']
            });

            if (!movimiento) {
                return res.status(404).json({
                    success: false,
                    message: 'Movimiento no encontrado'
                });
            }

            res.json({
                success: true,
                movimiento
            });
        } catch (error) {
            console.error('Error al obtener movimiento:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el movimiento',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Obtener resumen de movimientos
    obtenerResumen: async (req: Request, res: Response) => {
        try {
            const { fechaInicio, fechaFin } = req.query;

            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren las fechas de inicio y fin'
                });
            }

            const movimientos = await movimientoRepository.find({
                where: {
                    fecha: Between(new Date(fechaInicio as string), new Date(fechaFin as string)),
                    activo: true
                }
            });

            // Calcular totales por tipo de movimiento
            const resumen = movimientos.reduce((acc, mov) => {
                if (!acc[mov.tipo]) {
                    acc[mov.tipo] = {
                        cantidad: 0,
                        total: 0
                    };
                }
                acc[mov.tipo].cantidad++;
                acc[mov.tipo].total += Number(mov.monto || 0);
                return acc;
            }, {} as Record<TipoMovimiento, { cantidad: number; total: number }>);

            res.json({
                success: true,
                resumen,
                total_movimientos: movimientos.length
            });
        } catch (error) {
            console.error('Error al obtener resumen de movimientos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el resumen de movimientos',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Endpoint para SSE
    streamMovimientos: async (req: Request, res: Response) => {
        try {
            console.log('Iniciando conexión SSE...');

            // Verificar que la conexión está activa
            if (!req.socket) {
                console.error('Socket no disponible');
                throw new Error('Socket no disponible');
            }

            if (req.socket.destroyed) {
                console.error('Socket destruido');
                throw new Error('Socket destruido');
            }

            console.log('Configurando socket...');
            // Configurar el timeout para mantener la conexión abierta
            req.socket.setTimeout(0);
            req.socket.setNoDelay(true);
            req.socket.setKeepAlive(true);

            console.log('Agregando cliente al servicio de eventos...');
            // Agregar el cliente al servicio de eventos
            eventService.addClient(res);

            // Manejar la desconexión del cliente
            req.on('close', () => {
                console.log('Cliente desconectado');
                eventService.cleanup();
                res.end();
            });

            // Manejar errores de conexión
            req.on('error', (error) => {
                console.error('Error en la conexión SSE:', error);
                eventService.cleanup();
                res.end();
            });

        } catch (error) {
            console.error('Error detallado en el stream de movimientos:', {
                error: error instanceof Error ? error.message : 'Error desconocido',
                stack: error instanceof Error ? error.stack : undefined,
                socket: req.socket ? {
                    destroyed: req.socket.destroyed,
                    connecting: req.socket.connecting,
                    readable: req.socket.readable,
                    writable: req.socket.writable
                } : 'No socket disponible'
            });

            // Enviar respuesta de error antes de cerrar la conexión
            if (!res.headersSent) {
                res.writeHead(500, {
                    'Content-Type': 'application/json'
                });
                res.write(JSON.stringify({
                    success: false,
                    message: 'Error al establecer el stream de movimientos',
                    error: error instanceof Error ? error.message : 'Error desconocido'
                }));
            }
            res.end();
        }
    }
}; 