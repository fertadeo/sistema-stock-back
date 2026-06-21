const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const RIO_CUARTO_BOUNDS = {
  southwest: { lat: -33.2, lng: -64.4 },
  northeast: { lat: -33.0, lng: -64.2 },
};

export interface GeocodeSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  formatted_address?: string;
}

export interface GeocodeCoords {
  lat: number | null;
  lon: number | null;
  formatted_address?: string;
}

export interface DirectionsResult {
  coordenadas: [number, number][];
  distancia: number;
  duracion: number;
}

function getApiKey(): string {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY no está configurada');
  }
  return GOOGLE_MAPS_API_KEY;
}

function isInRioCuartoBounds(lat: number, lng: number): boolean {
  return (
    lat >= RIO_CUARTO_BOUNDS.southwest.lat &&
    lat <= RIO_CUARTO_BOUNDS.northeast.lat &&
    lng >= RIO_CUARTO_BOUNDS.southwest.lng &&
    lng <= RIO_CUARTO_BOUNDS.northeast.lng
  );
}

function formatGoogleAddress(result: {
  formatted_address?: string;
  address_components?: Array<{ long_name: string; types: string[] }>;
}): string {
  if (result.formatted_address) {
    return result.formatted_address;
  }
  return '';
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export async function searchAddresses(query: string): Promise<GeocodeSearchResult[]> {
  const searchQuery = `${query.trim()}, Río Cuarto, Córdoba, Argentina`;
  const params = new URLSearchParams({
    address: searchQuery,
    key: getApiKey(),
    language: 'es',
    region: 'ar',
    bounds: `${RIO_CUARTO_BOUNDS.southwest.lat},${RIO_CUARTO_BOUNDS.southwest.lng}|${RIO_CUARTO_BOUNDS.northeast.lat},${RIO_CUARTO_BOUNDS.northeast.lng}`,
    components: 'country:AR',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Error en Geocoding API: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Geocoding API: ${data.status} - ${data.error_message || ''}`);
  }

  if (!data.results?.length) {
    return [];
  }

  const uniqueResults = new Map<string, GeocodeSearchResult>();

  for (const result of data.results) {
    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;

    if (!isInRioCuartoBounds(lat, lng)) {
      continue;
    }

    const key = `${lat},${lng}`;
    if (!uniqueResults.has(key)) {
      uniqueResults.set(key, {
        display_name: result.formatted_address,
        lat: String(lat),
        lon: String(lng),
        type: result.types?.[0] || 'address',
        importance: 1,
        formatted_address: formatGoogleAddress(result),
      });
    }
  }

  return Array.from(uniqueResults.values()).slice(0, 10);
}

export async function geocodeAddress(direccion: string): Promise<GeocodeCoords> {
  if (!direccion?.trim()) {
    return { lat: null, lon: null };
  }

  const results = await searchAddresses(direccion);
  if (results.length === 0) {
    return { lat: null, lon: null };
  }

  const first = results[0];
  return {
    lat: parseFloat(first.lat),
    lon: parseFloat(first.lon),
    formatted_address: first.formatted_address || first.display_name,
  };
}

export async function reverseGeocode(lat: number, lon: number): Promise<{
  display_name: string;
  formatted_address: string;
  lat: string;
  lon: string;
}> {
  const params = new URLSearchParams({
    latlng: `${lat},${lon}`,
    key: getApiKey(),
    language: 'es',
    result_type: 'street_address|route|premise|subpremise',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Error en reverse geocoding: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.length) {
    return {
      display_name: 'Ubicación sin dirección identificada',
      formatted_address: 'Ubicación sin dirección identificada',
      lat: String(lat),
      lon: String(lon),
    };
  }

  const result = data.results[0];
  return {
    display_name: result.formatted_address,
    formatted_address: result.formatted_address,
    lat: String(lat),
    lon: String(lon),
  };
}

export async function getDirections(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<DirectionsResult> {
  if (waypoints.length < 2) {
    return { coordenadas: [], distancia: 0, duracion: 0 };
  }

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediate = waypoints.slice(1, -1);

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: getApiKey(),
    language: 'es',
    region: 'ar',
    mode: 'driving',
  });

  if (intermediate.length > 0) {
    const waypointStr = intermediate
      .map((wp) => `${wp.lat},${wp.lng}`)
      .join('|');
    params.set('waypoints', waypointStr);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Error en Directions API: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.routes?.length) {
    throw new Error(`Directions API: ${data.status} - ${data.error_message || ''}`);
  }

  const route = data.routes[0];
  const coordenadas: [number, number][] = [];

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const stepPoints = decodePolyline(step.polyline.points);
      if (coordenadas.length > 0 && stepPoints.length > 0) {
        coordenadas.push(...stepPoints.slice(1));
      } else {
        coordenadas.push(...stepPoints);
      }
    }
  }

  if (coordenadas.length === 0 && route.overview_polyline?.points) {
    coordenadas.push(...decodePolyline(route.overview_polyline.points));
  }

  let distancia = 0;
  let duracion = 0;
  for (const leg of route.legs) {
    distancia += leg.distance?.value || 0;
    duracion += leg.duration?.value || 0;
  }

  return { coordenadas, distancia, duracion };
}

export async function getDirectionsSegment(
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number }
): Promise<DirectionsResult> {
  return getDirections([origen, destino]);
}
