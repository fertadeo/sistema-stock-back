import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { repartidorRutaService } from '../services/repartidorRutaService';
import { pushNotificationService } from '../services/pushNotificationService';

export class RepartidorRutaController {
  listarParadas = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const fecha = typeof req.query.fecha === 'string' ? req.query.fecha : undefined;
      const paradas = await repartidorRutaService.listarParadas(userId, fecha);
      return res.json({ success: true, data: paradas });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al listar paradas';
      return res.status(500).json({ success: false, message });
    }
  };

  crearParada = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { cliente_id, comentario, hora_alerta, fecha } = req.body;

      if (!cliente_id) {
        return res.status(400).json({ success: false, message: 'cliente_id es requerido' });
      }

      const parada = await repartidorRutaService.crearParada(userId, {
        cliente_id: Number(cliente_id),
        comentario,
        hora_alerta,
        fecha,
      });

      return res.status(201).json({ success: true, data: parada });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear parada';
      const status = message.includes('ya está') ? 409 : 500;
      return res.status(status).json({ success: false, message });
    }
  };

  actualizarParada = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const paradaId = Number(req.params.id);
      const parada = await repartidorRutaService.actualizarParada(userId, paradaId, req.body);
      return res.json({ success: true, data: parada });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar parada';
      const status = message.includes('no encontrada') ? 404 : 500;
      return res.status(status).json({ success: false, message });
    }
  };

  eliminarParada = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const paradaId = Number(req.params.id);
      await repartidorRutaService.eliminarParada(userId, paradaId);
      return res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar parada';
      const status = message.includes('no encontrada') ? 404 : 500;
      return res.status(status).json({ success: false, message });
    }
  };

  marcarAlertaEnviada = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const paradaId = Number(req.params.id);
      await repartidorRutaService.marcarAlertaEnviada(paradaId, userId);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ success: false, message: 'Error al marcar alerta' });
    }
  };

  obtenerVapidPublicKey = async (_req: AuthRequest, res: Response) => {
    const publicKey = pushNotificationService.getPublicKey();
    return res.json({ success: true, data: { publicKey, habilitado: Boolean(publicKey) } });
  };

  suscribirPush = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ success: false, message: 'Suscripción push inválida' });
      }

      await repartidorRutaService.guardarPushSubscription(userId, { endpoint, keys });
      return res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al suscribir push';
      return res.status(500).json({ success: false, message });
    }
  };

  desuscribirPush = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ success: false, message: 'endpoint requerido' });
      }
      await repartidorRutaService.eliminarPushSubscription(userId, endpoint);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ success: false, message: 'Error al desuscribir push' });
    }
  };
}
