/**
 * Falla si el código fuente vuelve a pegarle a maps.googleapis.com.
 * Uso: npm run assert:no-google-maps
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const FORBIDDEN = [
  'maps.googleapis.com',
  'maps.google.com/maps/api',
];

const ALLOWED_BASENAMES = new Set([
  // stubs / comentarios de bloqueo pueden mencionar el host en strings de docs
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of walk(ROOT)) {
  const base = path.basename(file);
  if (ALLOWED_BASENAMES.has(base)) continue;
  const text = fs.readFileSync(file, 'utf8');
  // Permitir menciones solo en comentarios de bloqueo, no en URLs de fetch
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const isComment =
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*');
    for (const needle of FORBIDDEN) {
      if (!line.includes(needle)) continue;
      // URL activa (fetch/http) = fallo; comentario documental = ok
      if (isComment) continue;
      if (/https?:\/\//.test(line) || /fetch\s*\(/.test(line) || /`https/.test(line)) {
        offenders.push(`${file}:${idx + 1}: ${trimmed.slice(0, 120)}`);
      }
    }
  });
}

if (offenders.length > 0) {
  console.error('FATAL: se detectaron llamadas/URLs a Google Maps (riesgo de facturación):\n');
  for (const o of offenders) console.error(' -', o);
  console.error(
    '\nNo reactivar Maps sin kill switch, presupuesto y sin loops 1-llamada-por-cliente.'
  );
  process.exit(1);
}

console.log('OK: no hay URLs activas a maps.googleapis.com en src/');
process.exit(0);
