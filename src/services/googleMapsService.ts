/**
 * Google Maps DESHABILITADO.
 * Todas las llamadas HTTP a maps.googleapis.com están bloqueadas para evitar cargos.
 * No reactivar sin control de cuotas y sin Directions por tramo.
 */

const BLOQUEADO =
  'Google Maps API deshabilitada en este servidor (bloqueo de costos).';

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
  console.warn('[googleMaps] searchAddresses bloqueado');
  throw new Error(BLOQUEADO);
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
  console.warn('[googleMaps] getDirections bloqueado');
  throw new Error(BLOQUEADO);
}

export async function getDirectionsSegment(
  _origen: { lat: number; lng: number },
  _destino: { lat: number; lng: number }
): Promise<DirectionsResult> {
  console.warn('[googleMaps] getDirectionsSegment bloqueado');
  throw new Error(BLOQUEADO);
}
