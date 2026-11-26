/**
 * Falla el build si la API puede volver a llamar a Google Maps.
 * Uso: npm run assert:no-google-maps
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const FORBIDDEN = [
  'maps.googleapis.com',
  'maps.google.com',
  'places.googleapis.com',
  'routes.googleapis.com',
  'roads.googleapis.com',
  'addressvalidation.googleapis.com',
  'tile.googleapis.com',
];

const BLOCKER = path.join(ROOT, 'security', 'bloquearGoogleMaps.ts');
const INDEX = path.join(ROOT, 'index.ts');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function esComentario(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*')
  );
}

const offenders = [];

if (!fs.existsSync(BLOCKER)) {
  offenders.push('falta src/security/bloquearGoogleMaps.ts');
}

const index = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
const primerImport = index
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.startsWith('import '));
if (primerImport !== "import './security/bloquearGoogleMaps';") {
  offenders.push(
    "src/index.ts: el primer import debe ser './security/bloquearGoogleMaps'"
  );
}

for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  const esBloqueo = path.resolve(file) === path.resolve(BLOCKER);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, idx) => {
    if (esComentario(line)) return;
    const where = `${file}:${idx + 1}`;

    if (/process\.env\.(GOOGLE_MAPS_API_KEY|ENABLE_GOOGLE_MAPS|GOOGLE_MAPS_KEY)\b/.test(line)) {
      offenders.push(`${where}: no leer claves de Google Maps desde el entorno`);
    }

    for (const needle of FORBIDDEN) {
      if (!line.includes(needle)) continue;
      if (!esBloqueo) {
        offenders.push(`${where}: host de Google Maps fuera del bloqueo de red`);
        continue;
      }
      if (/https?:\/\//.test(line) || /fetch\s*\(/.test(line)) {
        offenders.push(
          `${where}: el bloqueo no puede armar una URL completa de Google en la misma línea`
        );
      }
    }
  });

  if (
    /routes\/(geocode|rutasRoutes)\.ts$/.test(file.replace(/\\/g, '/')) &&
    /googleMapsService/.test(text)
  ) {
    offenders.push(`${file}: la ruta no debe importar googleMapsService`);
  }
}

if (offenders.length > 0) {
  console.error('FATAL: la API podría volver a facturar Google Maps:\n');
  for (const item of offenders) console.error(' -', item);
  process.exit(1);
}

console.log('OK: la API no tiene URLs activas a Google Maps y el bloqueo de red está primero');
process.exit(0);
