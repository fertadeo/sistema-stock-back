import http from 'http';
import https from 'https';
import type { RequestOptions } from 'http';

/**
 * Corte de red de Google Maps Platform.
 * El incidente de nov 2026 fue un loop de Directions (1 request por cliente).
 * Este módulo se importa primero en index.ts y rechaza cualquier salida hacia
 * los hosts de Maps, aunque otro archivo vuelva a armar la URL.
 * No hace ninguna petición de prueba a Google: el chequeo es local.
 */

const HOSTS_BLOQUEADOS = [
  'maps.googleapis.com',
  'maps.google.com',
  'places.googleapis.com',
  'routes.googleapis.com',
  'roads.googleapis.com',
  'addressvalidation.googleapis.com',
  'tile.googleapis.com',
];

const MENSAJE =
  'Petición a Google Maps bloqueada. No se realizó ninguna llamada (bloqueo de costos).';

const CLAVES_DESCARTADAS = [
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'ENABLE_GOOGLE_MAPS',
];

export function urlEsGoogleMaps(valor: string): boolean {
  const texto = valor.toLowerCase();
  return HOSTS_BLOQUEADOS.some((host) => texto.includes(host));
}

function rechazar(url: string): never {
  console.error(`[googleMaps] BLOQUEO: se impidió una petición a ${url}`);
  throw new Error(MENSAJE);
}

function urlDeFetch(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input === 'object' && 'url' in input) {
    const url = (input as { url?: unknown }).url;
    return typeof url === 'string' ? url : '';
  }
  return '';
}

function urlDeHttp(args: unknown[]): string {
  const partes: string[] = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      partes.push(arg);
      continue;
    }
    if (arg instanceof URL) {
      partes.push(arg.toString());
      continue;
    }
    if (!arg || typeof arg !== 'object') continue;
    const opciones = arg as RequestOptions & { href?: string };
    if (typeof opciones.href === 'string') partes.push(opciones.href);
    if (typeof opciones.protocol === 'string') partes.push(opciones.protocol);
    if (typeof opciones.hostname === 'string') partes.push(opciones.hostname);
    if (typeof opciones.host === 'string') partes.push(opciones.host);
    if (typeof opciones.path === 'string') partes.push(opciones.path);
  }
  return partes.join(' ');
}

function envolverRequest(original: (...args: any[]) => any) {
  return function (this: unknown, ...args: any[]) {
    const url = urlDeHttp(args);
    if (urlEsGoogleMaps(url)) rechazar(url);
    return original.apply(this, args);
  };
}

if (typeof globalThis.fetch === 'function') {
  const fetchOriginal = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = urlDeFetch(input);
    if (urlEsGoogleMaps(url)) rechazar(url);
    return fetchOriginal(input, init);
  }) as typeof fetch;
}

http.request = envolverRequest(http.request) as typeof http.request;
http.get = envolverRequest(http.get) as typeof http.get;
https.request = envolverRequest(https.request) as typeof https.request;
https.get = envolverRequest(https.get) as typeof https.get;

for (const clave of CLAVES_DESCARTADAS) {
  if (process.env[clave]) {
    delete process.env[clave];
    console.log(`[googleMaps] se descartó ${clave} del entorno. No se usa.`);
  }
}

function verificarBloqueoLocal(): void {
  const protocolo = 'https://';
  const hostSonda = 'maps.googleapis.com';
  const sonda = protocolo + hostSonda + '/maps/api/directions/json?origin=0,0&destination=1,1';

  let httpsBloqueado = false;
  try {
    https.get(sonda);
  } catch (error) {
    httpsBloqueado = error instanceof Error && error.message.includes('bloqueada');
  }

  let fetchBloqueado = typeof globalThis.fetch !== 'function';
  if (!fetchBloqueado) {
    try {
      void globalThis.fetch(sonda);
    } catch (error) {
      fetchBloqueado = error instanceof Error && error.message.includes('bloqueada');
    }
  }

  if (!httpsBloqueado || !fetchBloqueado) {
    console.error(
      '[googleMaps] FATAL: el bloqueo de red no quedó instalado. El proceso no arranca.'
    );
    process.exit(1);
  }
  console.log('[googleMaps] red bloqueada: este proceso no puede llamar a Google Maps.');
}

verificarBloqueoLocal();
