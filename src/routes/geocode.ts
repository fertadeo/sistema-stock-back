import { Router } from 'express';

const router = Router();

const DESHABILITADO = {
  error: 'Google Geocoding deshabilitado',
  message:
    'La API de Geocoding de Google Maps fue desactivada para evitar cargos.',
};

router.get('/search', (_req, res) => {
  return res.status(503).json(DESHABILITADO);
});

router.get('/reverse', (_req, res) => {
  return res.status(503).json(DESHABILITADO);
});

export default router;
