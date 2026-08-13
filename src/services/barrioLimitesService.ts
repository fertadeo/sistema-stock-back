import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Zona } from '../entities/Zona';
import {
  centroide,
  convexHull,
  geoJsonAPoligono,
  Punto,
} from '../utils/geometria';

export type LimitesBarrioResult = {
  barrio: string;
  poligono: Punto[];
  centro: Punto;
  fuente: 'osm' | 'clientes';
  clientes_usados: number;
  mensaje: string;
};

async function buscarPoligonoOsm(barrio: string): Promise<Punto[] | null> {
  const queries = [
    `Barrio ${barrio}, Río Cuarto, Córdoba, Argentina`,
    `${barrio}, Río Cuarto, Córdoba, Argentina`,
    `Barrio ${barrio}, Rio Cuarto, Argentina`,
  ];

  for (const q of queries) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'json');
      url.searchParams.set('polygon_geojson', '1');
      url.searchParams.set('limit', '5');
      url.searchParams.set('countrycodes', 'ar');
      url.searchParams.set('addressdetails', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'SoderiaStock/1.0 (zonas-reparto; contacto@soderia.local)',
          Accept: 'application/json',
        },
      });

      if (!response.ok) continue;
      const results = (await response.json()) as Array<{
        geojson?: { type?: string; coordinates?: unknown };
        display_name?: string;
        class?: string;
        type?: string;
        address?: Record<string, string>;
      }>;

      if (!Array.isArray(results)) continue;

      for (const item of results) {
        const name = (item.display_name || '').toLowerCase();
        const inRioCuarto =
          name.includes('río cuarto') ||
          name.includes('rio cuarto') ||
          item.address?.city?.toLowerCase().includes('cuarto') ||
          item.address?.town?.toLowerCase().includes('cuarto') ||
          item.address?.municipality?.toLowerCase().includes('cuarto');

        if (!inRioCuarto) continue;

        const poly = item.geojson ? geoJsonAPoligono(item.geojson) : null;
        if (poly && poly.length >= 3) {
          return poly;
        }
      }
    } catch (error) {
      console.warn('[limites-barrio] Nominatim falló:', error);
    }
  }

  return null;
}

async function poligonoDesdeClientes(barrio: string): Promise<{
  poligono: Punto[];
  clientes: number;
} | null> {
  const zonaRepo = AppDataSource.getRepository(Zona);
  const clienteRepo = AppDataSource.getRepository(Clientes);

  const zonas = await zonaRepo.find();
  const barrioNorm = barrio.trim().toLowerCase();
  const zonaMatch = zonas.find((z) => z.nombre.trim().toLowerCase() === barrioNorm);

  let clientes: Clientes[] = [];
  if (zonaMatch) {
    clientes = await clienteRepo
      .createQueryBuilder('c')
      .where('c.zona = :zonaId', { zonaId: zonaMatch.id })
      .andWhere('c.latitud IS NOT NULL')
      .andWhere('c.longitud IS NOT NULL')
      .andWhere('c.estado = :estado', { estado: true })
      .getMany();
  }

  // Fallback: algunos clientes pueden tener zona inconsistente; buscar por nombre en dump no aplica.
  // Si no hay match por FK, no hay más datos.

  const puntos: Punto[] = [];
  for (const c of clientes) {
    const lat = Number(c.latitud);
    const lng = Number(c.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    puntos.push({ lat, lng });
  }

  if (puntos.length < 3) return null;

  const hull = convexHull(puntos);
  if (hull.length < 3) return null;

  return { poligono: hull, clientes: puntos.length };
}

export async function resolverLimitesBarrio(barrio: string): Promise<LimitesBarrioResult> {
  const nombre = barrio?.trim();
  if (!nombre) {
    throw new Error('El nombre del barrio es obligatorio');
  }

  const osm = await buscarPoligonoOsm(nombre);
  if (osm) {
    const centro = centroide(osm);
    return {
      barrio: nombre,
      poligono: osm,
      centro,
      fuente: 'osm',
      clientes_usados: 0,
      mensaje: 'Límites obtenidos desde OpenStreetMap.',
    };
  }

  const desdeClientes = await poligonoDesdeClientes(nombre);
  if (desdeClientes) {
    const centro = centroide(desdeClientes.poligono);
    return {
      barrio: nombre,
      poligono: desdeClientes.poligono,
      centro,
      fuente: 'clientes',
      clientes_usados: desdeClientes.clientes,
      mensaje: `No hay límites oficiales en OSM. Se estimó el perímetro con ${desdeClientes.clientes} clientes geolocalizados del barrio (envolvente convexa).`,
    };
  }

  throw new Error(
    `No se pudieron determinar los límites de "${nombre}". Probá el trazado manual o cargá más clientes con coordenadas en ese barrio.`
  );
}
