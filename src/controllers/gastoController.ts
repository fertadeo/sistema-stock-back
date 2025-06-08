import { Request, Response } from 'express';
import { MovimientoService } from '../services/movimientoService';
import { TipoMovimiento } from '../entities/Movimiento';
import { Between } from 'typeorm';

const movimientoService = new MovimientoService();

export const gastoController = {
    // Registrar un nuevo gasto
    registrarGasto: async (req: Request, res: Response) => {
        try {
            const { monto, concepto, detalles } = req.body;

            // Validar datos requeridos
            if (!monto || !concepto) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto y el concepto son requeridos'
                });
            }

            // Validar que el monto sea positivo
            if (monto <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto debe ser mayor a 0'
                });
            }

            // Registrar el gasto
            const gasto = await movimientoService.registrarGasto(
                monto,
                concepto,
                {
                    ...detalles,
                    fecha_registro: new Date()
                }
            );

            res.status(201).json({
                success: true,
                message: 'Gasto registrado exitosamente',
                gasto
            });
        } catch (error) {
            console.error('Error al registrar gasto:', error);
            res.status(500).json({
                success: false,
                message: 'Error al registrar el gasto',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Obtener todos los gastos
    obtenerGastos: async (req: Request, res: Response) => {
        try {
            const { fechaInicio, fechaFin, page = 1, limit = 10 } = req.query;

            const where: any = {
                tipo: TipoMovimiento.GASTO,
                activo: true
            };

            // Aplicar filtros de fecha si existen
            if (fechaInicio && fechaFin) {
                where.fecha = Between(new Date(fechaInicio as string), new Date(fechaFin as string));
            }

            const [gastos, total] = await movimientoService.obtenerMovimientos(
                where,
                Number(page),
                Number(limit)
            );

            res.json({
                success: true,
                gastos,
                paginacion: {
                    total,
                    pagina: Number(page),
                    porPagina: Number(limit),
                    totalPaginas: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            console.error('Error al obtener gastos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los gastos',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Obtener un gasto específico
    obtenerGastoPorId: async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de gasto inválido'
                });
            }

            const gasto = await movimientoService.obtenerMovimientoPorId (id);

            if (!gasto || gasto.tipo !== TipoMovimiento.GASTO) {
                return res.status(404).json({
                    success: false,
                    message: 'Gasto no encontrado'
                });
            }

            res.json({
                success: true,
                gasto
            });
        } catch (error) {
            console.error('Error al obtener gasto:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el gasto',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}; 