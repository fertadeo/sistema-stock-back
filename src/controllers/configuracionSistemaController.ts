import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
  actualizarConfiguracionSistema,
  obtenerConfiguracionSistema,
} from '../services/configuracionSistemaService';

export const getConfiguracionSistema = async (_req: AuthRequest, res: Response) => {
  try {
    const config = await obtenerConfiguracionSistema(true);
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('[configuracion] Error al obtener:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la configuración',
    });
  }
};

export const putConfiguracionSistema = async (req: AuthRequest, res: Response) => {
  try {
    const { repartidor_solo_clientes_propios } = req.body ?? {};

    if (
      repartidor_solo_clientes_propios !== undefined &&
      typeof repartidor_solo_clientes_propios !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        message: 'repartidor_solo_clientes_propios debe ser boolean',
      });
    }

    const config = await actualizarConfiguracionSistema({
      repartidor_solo_clientes_propios,
    });

    return res.json({
      success: true,
      message: 'Configuración actualizada',
      data: config,
    });
  } catch (error) {
    console.error('[configuracion] Error al actualizar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la configuración',
    });
  }
};
