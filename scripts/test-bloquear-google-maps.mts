/**
 * Prueba que el proceso rechaza Google Maps y deja pasar el resto.
 * No abre ninguna conexión a Google.
 */
import http from 'http';
import https from 'https';

process.env.GOOGLE_MAPS_API_KEY = 'secreto-de-prueba';
process.env.ENABLE_GOOGLE_MAPS = 'true';

async function main(): Promise<void> {
  const mod = await import('../src/security/bloquearGoogleMaps.ts');

  if (process.env.GOOGLE_MAPS_API_KEY || process.env.ENABLE_GOOGLE_MAPS) {
    throw new Error('la clave de Google Maps siguió disponible en el entorno');
  }

  if (!mod.urlEsGoogleMaps('https://maps.googleapis.com/maps/api/directions/json')) {
    throw new Error('no detecta maps.googleapis.com');
  }
  if (mod.urlEsGoogleMaps('https://nominatim.openstreetmap.org/search?q=test')) {
    throw new Error('el bloqueo también corta OpenStreetMap');
  }

  let fetchBloqueado = false;
  try {
    await fetch('https://' + 'maps.googleapis.com' + '/maps/api/geocode/json?address=test');
  } catch (error) {
    fetchBloqueado = error instanceof Error && error.message.includes('bloqueada');
  }
  if (!fetchBloqueado) {
    throw new Error('fetch a Google Maps no fue bloqueado');
  }

  let httpsBloqueado = false;
  try {
    https.get('https://' + 'routes.googleapis.com' + '/directions/v2:computeRoutes');
  } catch (error) {
    httpsBloqueado = error instanceof Error && error.message.includes('bloqueada');
  }
  if (!httpsBloqueado) {
    throw new Error('https.get a Google Maps no fue bloqueado');
  }

  const local = http.request({
    hostname: '127.0.0.1',
    port: 9,
    path: '/salud',
    method: 'GET',
  });
  local.on('error', () => undefined);
  local.destroy();

  console.log('OK: la API no puede llamar a Google Maps');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
