/**
 * =============================================================================
 * GOOGLE MAPS — BLOQUEADO (incidente de costos, nov 2026)
 * =============================================================================
 * Un loop de Directions (1 request por cliente/tramo) generó cargos de cientos
 * de USD. Este módulo NO debe volver a hacer HTTP a maps.googleapis.com.
 *
 * Para reactivar (solo con pedido explícito del dueño del proyecto):
 * 1. ENABLE_GOOGLE_MAPS=true
 * 2. GOOGLE_MAPS_MAX_CALLS_PER_PROCESS con un tope bajo (ej. 20)
 * 3. Nunca llamar getDirections/geocode en un for-por-cliente
 * 4. Preferir batch único o cálculo local (Haversine)
 * =============================================================================
 */

const ENABLED = process.env.ENABLE_GOOGLE_MAPS === 'true';
const MAX_CALLS = Math.max(
  0,
  parseInt(process.env.GOOGLE_MAPS_MAX_CALLS_PER_PROCESS || '0', 10) || 0
);

let callsThisProcess = 0;

const BLOQUEADO =
  'Google Maps API deshabilitada (bloqueo de costos). No se realizan llamadas a Google.';

function assertPuedeLlamar(_operacion: string): never {
  // Incluso con ENABLE_GOOGLE_MAPS=true, el código de red fue eliminado a propósito.
  // Reactivar requiere reimplementar con batch + presupuesto, no pegar el loop viejo.
  callsThisProcess += 1;
  console.error(
    `[googleMaps] intento bloqueado (enable=${ENABLED}, max=${MAX_CALLS}, count=${callsThisProcess})`
  );
  throw new Error(BLOQUEADO);
}

export function googleMapsEstaHabilitado(): boolean {
  return false;
}

export function googleMapsCallsCount(): number {
  return callsThisProcess;
}

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

export async function searchAddresses(_query: string): Promise<GeocodeSearchResult[]> {
  assertPuedeLlamar('searchAddresses');
}

export async function geocodeAddress(_direccion: string): Promise<GeocodeCoords> {
  console.warn('[googleMaps] geocodeAddress bloqueado');
  return { lat: null, lon: null };
}

export async function reverseGeocode(lat: number, lon: number): Promise<{
  display_name: string;
  formatted_address: string;
  lat: string;
  lon: string;
}> {
  console.warn('[googleMaps] reverseGeocode bloqueado');
  return {
    display_name: 'Geocoding deshabilitado',
    formatted_address: 'Geocoding deshabilitado',
    lat: String(lat),
    lon: String(lon),
  };
}

export async function getDirections(
  _waypoints: Array<{ lat: number; lng: number }>
): Promise<DirectionsResult> {
  assertPuedeLlamar('getDirections');
}

export async function getDirectionsSegment(
  _origen: { lat: number; lng: number },
  _destino: { lat: number; lng: number }
): Promise<DirectionsResult> {
  assertPuedeLlamar('getDirectionsSegment');
}
