import { Router } from 'express';
import { getDirections, getDirectionsSegment } from '../services/googleMapsService';

const router = Router();

interface Waypoint {
  lat: number;
  lng: number;
}

router.post('/directions', async (req, res) => {
  try {
    const { waypoints, origen, destino } = req.body;

    if (origen && destino) {
      const lat1 = parseFloat(origen.lat ?? origen[0]);
      const lng1 = parseFloat(origen.lng ?? origen.lon ?? origen[1]);
      const lat2 = parseFloat(destino.lat ?? destino[0]);
      const lng2 = parseFloat(destino.lng ?? destino.lon ?? destino[1]);

      if ([lat1, lng1, lat2, lng2].some(isNaN)) {
        return res.status(400).json({ error: 'origen y destino deben tener coordenadas válidas' });
      }

      const result = await getDirectionsSegment(
        { lat: lat1, lng: lng1 },
        { lat: lat2, lng: lng2 }
      );
      return res.json(result);
    }

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({
        error: 'Se requiere un array waypoints con al menos 2 puntos, o origen y destino',
      });
    }

    const parsed: Waypoint[] = waypoints.map((wp: Waypoint | number[]) => {
      if (Array.isArray(wp)) {
        return { lat: wp[0], lng: wp[1] };
      }
      return {
        lat: parseFloat(String(wp.lat)),
        lng: parseFloat(String(wp.lng ?? (wp as { lon?: number }).lon)),
      };
    });

    if (parsed.some((wp) => isNaN(wp.lat) || isNaN(wp.lng))) {
      return res.status(400).json({ error: 'Todos los waypoints deben tener lat y lng válidos' });
    }

    const result = await getDirections(parsed);
    res.json(result);
  } catch (error) {
    console.error('Error en directions:', error);
    res.status(500).json({
      error: 'Error al calcular la ruta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;
