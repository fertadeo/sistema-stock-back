import { Request, Response } from 'express';
import { SincronizacionService } from '../services/sincronizacionService';

const sincronizacionService = new SincronizacionService();

export class SincronizacionController {
    /**
     * Recibe operaciones pendientes desde el cliente y las sincroniza
     * POST /api/sincronizacion/operaciones
     */
    sincronizarOperaciones = async (req: Request, res: Response) => {
        try {
            const { operaciones } = req.body;

            if (!operaciones || !Array.isArray(operaciones) || operaciones.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar un array de operaciones'
                });
            }

            // Validar estructura básica de cada operación
            for (const operacion of operaciones) {
                if (!operacion.operacion_id || !operacion.tipo || !operacion.datos_operacion) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cada operación debe tener operacion_id, tipo y datos_operacion',
                        operacion_invalida: operacion
                    });
                }
            }

            const resultados = await sincronizacionService.recibirOperacionesPendientes(operaciones);

            const resumen = {
                total: resultados.length,
                sincronizadas: resultados.filter(r => r.estado === 'sincronizado').length,
                errores: resultados.filter(r => r.estado === 'error').length,
                duplicadas: resultados.filter(r => r.estado === 'duplicado').length
            };

            res.status(200).json({
                success: true,
                message: `Procesadas ${resultados.length} operaciones`,
                resumen,
                resultados
            });
        } catch (error) {
            console.error('Error al sincronizar operaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error al sincronizar las operaciones',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };

    /**
     * Obtiene el estado de sincronización de operaciones
     * GET /api/sincronizacion/estado
     */
    obtenerEstadoSincronizacion = async (req: Request, res: Response) => {
        try {
            const { repartidor_id, dispositivo_id } = req.query;

            const repartidorId = repartidor_id ? parseInt(repartidor_id as string) : undefined;
            const dispositivoId = dispositivo_id ? dispositivo_id as string : undefined;

            const estado = await sincronizacionService.obtenerEstadoSincronizacion(
                repartidorId,
                dispositivoId
            );

            res.json({
                success: true,
                data: estado
            });
        } catch (error) {
            console.error('Error al obtener estado de sincronización:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el estado de sincronización',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };

    /**
     * Reintenta sincronizar operaciones con error
     * POST /api/sincronizacion/reintentar
     */
    reintentarOperacionesConError = async (req: Request, res: Response) => {
        try {
            const { repartidor_id, dispositivo_id, max_intentos } = req.body;

            const repartidorId = repartidor_id ? parseInt(repartidor_id) : undefined;
            const dispositivoId = dispositivo_id ? dispositivo_id : undefined;
            const maxIntentos = max_intentos ? parseInt(max_intentos) : 5;

            const resultados = await sincronizacionService.reintentarOperacionesConError(
                repartidorId,
                dispositivoId,
                maxIntentos
            );

            const resumen = {
                total: resultados.length,
                sincronizadas: resultados.filter(r => r.estado === 'sincronizado').length,
                errores: resultados.filter(r => r.estado === 'error').length,
                max_intentos_alcanzados: resultados.filter(r => r.estado === 'max_intentos').length
            };

            res.json({
                success: true,
                message: `Procesadas ${resultados.length} operaciones`,
                resumen,
                resultados
            });
        } catch (error) {
            console.error('Error al reintentar operaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error al reintentar las operaciones',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };

    /**
     * Verifica la conectividad y estado del servidor
     * GET /api/sincronizacion/ping
     */
    ping = async (req: Request, res: Response) => {
        try {
            res.json({
                success: true,
                message: 'Servidor disponible',
                timestamp: new Date().toISOString(),
                servidor: 'online'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
}
