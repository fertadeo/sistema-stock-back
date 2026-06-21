import { Router } from 'express';
import {
  searchAddresses,
  reverseGeocode,
} from '../services/googleMapsService';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'El parámetro query es requerido y debe ser una cadena de texto',
      });
    }

    const results = await searchAddresses(query);
    res.json(results);
  } catch (error) {
    console.error('Error en geocoding:', error);
    res.status(500).json({
      error: 'Error al procesar la solicitud de geocoding',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon || typeof lat !== 'string' || typeof lon !== 'string') {
      return res.status(400).json({
        error: 'Los parámetros lat y lon son requeridos',
      });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        error: 'lat y lon deben ser números válidos',
      });
    }

    const result = await reverseGeocode(latNum, lonNum);
    res.json(result);
  } catch (error) {
    console.error('Error en reverse geocoding:', error);
    res.status(500).json({
      error: 'Error al procesar reverse geocoding',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;
