import { Request, Response } from 'express';
import { MovimientoService } from '../services/movimientoService';
import { TipoMovimiento } from '../entities/Movimiento';
import { Between } from 'typeorm';

const movimientoService = new MovimientoService();

export const metricasController = {
    obtenerMetricas: async (req: Request, res: Response) => {
        try {
            const { fechaInicio, fechaFin } = req.query;

            const where: any = { activo: true };
            if (fechaInicio && fechaFin) {
                where.fecha = Between(new Date(fechaInicio as string), new Date(fechaFin as string));
            }

            const movimientos = await movimientoService.obtenerMovimientos(where, 1, 1000);

            // Calcular métricas
            const metricas = {
                ventas: {
                    local: 0,
                    repartidores: 0,
                    revendedores: 0
                },
                gastos: 0,
                ganancias: {
                    empresa: 0,
                    repartidores: 0,
                    revendedores: 0
                },
                balance: 0
            };

            movimientos[0].forEach(mov => {
                switch (mov.tipo) {
                    case TipoMovimiento.VENTA_LOCAL:
                        metricas.ventas.local += Number(mov.monto || 0);
                        metricas.ganancias.empresa += Number(mov.monto || 0);
                        break;
                    case TipoMovimiento.CIERRE_VENTA:
                        metricas.ventas.repartidores += Number(mov.monto || 0);
                        if (mov.detalles) {
                            metricas.ganancias.empresa += Number(mov.detalles.ganancia_fabrica || 0);
                            metricas.ganancias.repartidores += Number(mov.detalles.ganancia_repartidor || 0);
                        }
                        break;
                    case TipoMovimiento.GASTO:
                        metricas.gastos += Number(mov.monto || 0);
                        break;
                }
            });

            // Calcular balance total
            metricas.balance = 
                metricas.ventas.local + 
                metricas.ventas.repartidores + 
                metricas.ventas.revendedores - 
                metricas.gastos;

            res.json({
                success: true,
                metricas,
                periodo: {
                    inicio: fechaInicio,
                    fin: fechaFin
                }
            });
        } catch (error) {
            console.error('Error al obtener métricas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las métricas',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}; 