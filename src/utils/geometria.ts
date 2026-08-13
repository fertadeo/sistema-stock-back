export type Punto = { lat: number; lng: number };

/** Centroide simple promedio. */
export function centroide(puntos: Punto[]): Punto {
  if (puntos.length === 0) return { lat: 0, lng: 0 };
  const sum = puntos.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / puntos.length, lng: sum.lng / puntos.length };
}

/** Convex hull (Andrew's monotone chain). Devuelve polígono cerrado sin repetir el primer punto al final. */
export function convexHull(puntos: Punto[]): Punto[] {
  const unique = dedupePuntos(puntos);
  if (unique.length <= 2) return unique;

  const sorted = [...unique].sort((a, b) =>
    a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng
  );

  const cross = (o: Punto, a: Punto, b: Punto) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

  const lower: Punto[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Punto[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function dedupePuntos(puntos: Punto[]): Punto[] {
  const seen = new Set<string>();
  const out: Punto[] = [];
  for (const p of puntos) {
    const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Extrae el anillo exterior de un GeoJSON Polygon o MultiPolygon. */
export function geoJsonAPoligono(geometry: {
  type?: string;
  coordinates?: unknown;
}): Punto[] | null {
  if (!geometry?.type || !geometry.coordinates) return null;

  let ring: number[][] | null = null;
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    ring = coords[0] ?? null;
  } else if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    // Tomar el polígono con más vértices (suele ser el principal)
    let best: number[][] | null = null;
    for (const poly of coords) {
      const candidate = poly[0];
      if (!candidate) continue;
      if (!best || candidate.length > best.length) best = candidate;
    }
    ring = best;
  }

  if (!ring || ring.length < 3) return null;

  const puntos: Punto[] = [];
  for (const pair of ring) {
    const lng = Number(pair[0]);
    const lat = Number(pair[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    puntos.push({ lat, lng });
  }

  // Quitar cierre duplicado si viene
  if (
    puntos.length > 1 &&
    puntos[0].lat === puntos[puntos.length - 1].lat &&
    puntos[0].lng === puntos[puntos.length - 1].lng
  ) {
    puntos.pop();
  }

  return puntos.length >= 3 ? puntos : null;
}

export function validarPoligono(puntos: unknown): Punto[] {
  if (!Array.isArray(puntos) || puntos.length < 3) {
    throw new Error('El polígono debe tener al menos 3 puntos');
  }
  const normalizados: Punto[] = [];
  for (const p of puntos) {
    if (!p || typeof p !== 'object') throw new Error('Punto de polígono inválido');
    const lat = Number((p as Punto).lat);
    const lng = Number((p as Punto).lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error('Latitud de polígono inválida');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error('Longitud de polígono inválida');
    }
    normalizados.push({ lat, lng });
  }
  return normalizados;
}
