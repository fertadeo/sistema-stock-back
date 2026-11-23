import { Router } from 'express';

const router = Router();

/**
 * Directions deshabilitado: antes llamaba a Google una vez por tramo
 * y generaba costos masivos. No reactivar sin cuota y sin batching.
 */
router.post('/directions', (_req, res) => {
  return res.status(503).json({
    error: 'Google Directions deshabilitado',
    message:
      'La API de Directions de Google Maps fue desactivada para evitar cargos. La ruta se dibuja en el cliente sin llamar a Google.',
  });
});

export default router;
