import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { avisoRepartidorService } from '../services/avisoRepartidorService';
import { USER_ROLES } from '../constants/roles';

const resolverRepartidorId = (req: AuthRequest): number | null => {
  if (req.user?.role === USER_ROLES.REPARTIDOR && req.user.repartidor_id) {
    return Number(req.user.repartidor_id);
  }
  if (typeof req.query.repartidor_id === 'string' && req.query.repartidor_id) {
    return Number(req.query.repartidor_id);
  }
  return null;
};

export const listarAvisos = async (req: AuthRequest, res: Response) => {
  try {
    const repartidorId = resolverRepartidorId(req);
    if (!repartidorId) {
      return res.status(400).json({ success: false, message: 'Repartidor no identificado' });
    }
    const soloNoLeidos = req.query.no_leidos === '1' || req.query.no_leidos === 'true';
    const avisos = await avisoRepartidorService.listarPorRepartidor(repartidorId, soloNoLeidos);
    const no_leidos = await avisoRepartidorService.contarNoLeidos(repartidorId);
    return res.json({ success: true, data: { avisos, no_leidos } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al listar avisos';
    return res.status(500).json({ success: false, message });
  }
};

export const marcarAvisoLeido = async (req: AuthRequest, res: Response) => {
  try {
    const repartidorId = resolverRepartidorId(req);
    if (!repartidorId) {
      return res.status(400).json({ success: false, message: 'Repartidor no identificado' });
    }
    const id = Number(req.params.id);
    const aviso = await avisoRepartidorService.marcarLeido(id, repartidorId);
    return res.json({ success: true, data: aviso });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al marcar aviso';
    const status = message.includes('no encontrado') ? 404 : 500;
    return res.status(status).json({ success: false, message });
  }
};

export const marcarTodosAvisosLeidos = async (req: AuthRequest, res: Response) => {
  try {
    const repartidorId = resolverRepartidorId(req);
    if (!repartidorId) {
      return res.status(400).json({ success: false, message: 'Repartidor no identificado' });
    }
    await avisoRepartidorService.marcarTodosLeidos(repartidorId);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al marcar avisos';
    return res.status(500).json({ success: false, message });
  }
};
