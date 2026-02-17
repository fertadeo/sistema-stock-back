import { Request, Response } from 'express';
import { RepartidorRapidoService } from '../services/repartidorRapidoService';
import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';

const repartidorRapidoService = new RepartidorRapidoService();
const clienteRepository = AppDataSource.getRepository(Clientes);

export class RepartidorRapidoController {
    /**
     * Registra una venta rápida con opción de fiado y registro de envases
     * POST /api/repartidor-rapido/venta
     */
    registrarVentaRapida = async (req: Request, res: Response) => {
        try {
            const {
                cliente_id,
                productos,
                monto_total,
                medio_pago = 'efectivo',
                forma_pago = 'total',
                saldo_monto,
                repartidor_id,
                envases_prestados,
                envases_devueltos,
                observaciones
            } = req.body;

            // Validaciones básicas
            if (!cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El cliente_id es requerido'
                });
            }

            if (!productos || !Array.isArray(productos) || productos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un producto'
                });
            }

            if (!monto_total || monto_total <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto_total debe ser mayor a 0'
                });
            }

            const resultado = await repartidorRapidoService.registrarVentaRapida({
                cliente_id,
                productos,
                monto_total,
                medio_pago,
                forma_pago,
                saldo_monto,
                repartidor_id,
                envases_prestados,
                envases_devueltos,
                observaciones
            });

            res.status(201).json({
                success: true,
                message: 'Venta registrada exitosamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al registrar venta rápida:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Error al registrar la venta',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };

    /**
     * Registra un cobro rápido a un cliente
     * POST /api/repartidor-rapido/cobro
     */
    registrarCobroRapido = async (req: Request, res: Response) => {
        try {
            const {
                cliente_id,
                monto,
                medio_pago = 'efectivo',
                repartidor_id,
                observaciones,
                venta_relacionada_id
            } = req.body;

            // Validaciones básicas
            if (!cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El cliente_id es requerido'
                });
            }

            if (!monto || monto <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto debe ser mayor a 0'
                });
            }

            const cobro = await repartidorRapidoService.registrarCobroRapido({
                cliente_id,
                monto,
                medio_pago,
                repartidor_id,
                observaciones,
                venta_relacionada_id
            });

            res.status(201).json({
                success: true,
                message: 'Cobro registrado exitosamente',
                data: cobro
            });
        } catch (error) {
            console.error('Error al registrar cobro rápido:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Error al registrar el cobro',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };

    /**
     * Registra un fiado (venta sin pago inmediato)
     * POST /api/repartidor-rapido/fiado
     */
    registrarFiadoRapido = async (req: Request, res: Response) => {
        try {
            const {
                cliente_id,
                productos,
                monto_total,
                repartidor_id,
                envases_prestados,
                observaciones
            } = req.body;

            // Validaciones básicas
            if (!cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El cliente_id es requerido'
                });
            }

            if (!productos || !Array.isArray(productos) || productos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un producto'
                });
            }

            if (!monto_total || monto_total <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto_total debe ser mayor a 0'
                });
            }

            const resultado = await repartidorRapidoService.registrarFiadoRapido({
                cliente_id,
                productos,
                monto_total,
                repartidor_id,
                envases_prestados,
                observaciones
            });

            res.status(201).json({
                success: true,
                message: 'Fiado registrado exitosamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al registrar fiado rápido:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Error al registrar el fiado',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };

    /**
     * Obtiene el resumen de envases de un cliente
     * GET /api/repartidor-rapido/envases/:cliente_id
     */
    obtenerResumenEnvases = async (req: Request, res: Response) => {
        try {
            const cliente_id = parseInt(req.params.cliente_id);

            if (!cliente_id || isNaN(cliente_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de cliente inválido'
                });
            }

            const resumen = await repartidorRapidoService.obtenerResumenEnvases(cliente_id);

            res.json({
                success: true,
                data: resumen
            });
        } catch (error) {
            console.error('Error al obtener resumen de envases:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el resumen de envases',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
}
