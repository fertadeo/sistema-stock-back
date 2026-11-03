import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { delegarZonaService } from '../services/delegarZonaService';

export const delegarZona = async (req: AuthRequest, res: Response) => {
  try {
    const { zona_id, repartidor_origen, repartidor_destino, cliente_ids } = req.body;
    const resultado = await delegarZonaService.delegarZona({
      zona_id: zona_id != null ? Number(zona_id) : null,
      repartidor_origen: repartidor_origen || null,
      repartidor_destino,
      cliente_ids: Array.isArray(cliente_ids) ? cliente_ids.map(Number) : [],
    });
    return res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al delegar zona';
    const status =
      message.includes('obligator') ||
      message.includes('distintos') ||
      message.includes('seleccionar') ||
      message.includes('no pertenecen') ||
      message.includes('no encontrado') ||
      message.includes('no existen')
        ? 400
        : 500;
    return res.status(status).json({ success: false, message });
  }
};
