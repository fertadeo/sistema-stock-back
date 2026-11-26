/**
 * GOOGLE MAPS — BLOQUEADO (incidente de costos, nov 2026).
 * Un loop de Directions (1 request por cliente) generó más de 200.000 solicitudes.
 * Estas funciones no tienen URL ni clave. El corte de red está en
 * src/security/bloquearGoogleMaps.ts, importado antes que el resto del proceso.
 * Ninguna variable de entorno vuelve a habilitar las llamadas.
 */

let callsThisProcess = 0;

const BLOQUEADO =
  'Google Maps API deshabilitada (bloqueo de costos). No se realizan llamadas a Google.';

function assertPuedeLlamar(operacion: string): never {
  callsThisProcess += 1;
  console.error(`[googleMaps] intento bloqueado (${operacion}, count=${callsThisProcess})`);
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
