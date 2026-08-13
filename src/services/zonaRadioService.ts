import { AppDataSource } from '../config/database';
import { ZonaRadio, TipoZonaRadio, PuntoPoligono } from '../entities/ZonaRadio';
import { centroide, validarPoligono } from '../utils/geometria';
import { resolverLimitesBarrio } from './barrioLimitesService';

export type ZonaRadioInput = {
  nombre: string;
  tipo?: TipoZonaRadio;
  latitud?: number;
  longitud?: number;
  radio_metros?: number | null;
  poligono?: PuntoPoligono[] | null;
  barrio_nombre?: string | null;
  origen_limites?: string | null;
  color?: string;
  repartidor?: string | null;
  activo?: boolean;
};

const COLORES_DEFAULT = [
  '#0d9488',
  '#2563eb',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#059669',
  '#db2777',
];

function colorPorIndice(indice: number): string {
  return COLORES_DEFAULT[indice % COLORES_DEFAULT.length];
}

function normalizarTipo(tipo: unknown): TipoZonaRadio {
  if (tipo === 'barrio' || tipo === 'poligono' || tipo === 'radio') return tipo;
  return 'radio';
}

function validarYNormalizar(data: Partial<ZonaRadioInput>, parcial = false) {
  const tipo = data.tipo !== undefined ? normalizarTipo(data.tipo) : undefined;

  if (!parcial || data.nombre !== undefined) {
    if (!data.nombre || !String(data.nombre).trim()) {
      throw new Error('El nombre de la zona es obligatorio');
    }
  }

  if (!parcial && !tipo) {
    throw new Error('El tipo de zona es obligatorio');
  }

  const tipoEfectivo = tipo ?? 'radio';

  if (tipoEfectivo === 'radio') {
    if (!parcial || data.latitud !== undefined) {
      const lat = Number(data.latitud);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitud inválida');
      }
    }
    if (!parcial || data.longitud !== undefined) {
      const lng = Number(data.longitud);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        throw new Error('Longitud inválida');
      }
    }
    if (!parcial || data.radio_metros !== undefined) {
      const radio = Number(data.radio_metros);
      if (!Number.isFinite(radio) || radio < 50 || radio > 50000) {
        throw new Error('El radio debe estar entre 50 m y 50 km');
      }
    }
    return {
      tipo: 'radio' as const,
      latitud: data.latitud != null ? Number(data.latitud) : undefined,
      longitud: data.longitud != null ? Number(data.longitud) : undefined,
      radio_metros:
        data.radio_metros != null ? Math.round(Number(data.radio_metros)) : undefined,
      poligono: null as PuntoPoligono[] | null,
      barrio_nombre: null as string | null,
      origen_limites: null as string | null,
    };
  }

  // barrio | poligono
  if (!parcial || data.poligono !== undefined) {
    const poly = validarPoligono(data.poligono);
    const centro = centroide(poly);
    return {
      tipo: tipoEfectivo as 'barrio' | 'poligono',
      latitud: centro.lat,
      longitud: centro.lng,
      radio_metros: null as number | null,
      poligono: poly,
      barrio_nombre:
        tipoEfectivo === 'barrio'
          ? (data.barrio_nombre?.trim() || data.nombre?.trim() || null)
          : null,
      origen_limites:
        data.origen_limites?.trim() ||
        (tipoEfectivo === 'poligono' ? 'manual' : null),
    };
  }

  return {
    tipo: tipoEfectivo as 'barrio' | 'poligono',
    latitud: data.latitud != null ? Number(data.latitud) : undefined,
    longitud: data.longitud != null ? Number(data.longitud) : undefined,
    radio_metros: null as number | null,
    poligono: undefined as PuntoPoligono[] | null | undefined,
    barrio_nombre:
      data.barrio_nombre !== undefined
        ? data.barrio_nombre?.trim() || null
        : undefined,
    origen_limites:
      data.origen_limites !== undefined
        ? data.origen_limites?.trim() || null
        : undefined,
  };
}

export class ZonaRadioService {
  private repo = AppDataSource.getRepository(ZonaRadio);

  async listar(incluirInactivas = false): Promise<ZonaRadio[]> {
    return this.repo.find({
      where: incluirInactivas ? {} : { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerPorId(id: number): Promise<ZonaRadio> {
    const zona = await this.repo.findOne({ where: { id } });
    if (!zona) {
      throw new Error('Zona no encontrada');
    }
    return zona;
  }

  async crear(data: ZonaRadioInput): Promise<ZonaRadio> {
    const tipo = normalizarTipo(data.tipo ?? 'radio');
    const normalizado = validarYNormalizar({ ...data, tipo }, false);
    const existentes = await this.repo.count();

    const zona = this.repo.create({
      nombre: data.nombre.trim(),
      tipo: normalizado.tipo,
      latitud: Number(normalizado.latitud),
      longitud: Number(normalizado.longitud),
      radio_metros: normalizado.radio_metros ?? null,
      poligono: normalizado.poligono ?? null,
      barrio_nombre: normalizado.barrio_nombre ?? null,
      origen_limites: normalizado.origen_limites ?? null,
      color: data.color?.trim() || colorPorIndice(existentes),
      repartidor: data.repartidor?.trim() || null,
      activo: data.activo !== false,
    });
    return this.repo.save(zona);
  }

  async actualizar(id: number, data: Partial<ZonaRadioInput>): Promise<ZonaRadio> {
    const zona = await this.obtenerPorId(id);
    const tipo = data.tipo !== undefined ? normalizarTipo(data.tipo) : zona.tipo;
    const normalizado = validarYNormalizar({ ...data, tipo, nombre: data.nombre ?? zona.nombre }, true);

    if (data.nombre !== undefined) zona.nombre = data.nombre.trim();
    if (data.tipo !== undefined) zona.tipo = normalizado.tipo;
    if (normalizado.latitud !== undefined) zona.latitud = normalizado.latitud;
    if (normalizado.longitud !== undefined) zona.longitud = normalizado.longitud;
    if (data.radio_metros !== undefined || data.tipo !== undefined || data.poligono !== undefined) {
      zona.radio_metros = normalizado.radio_metros ?? null;
    }
    if (data.poligono !== undefined || data.tipo !== undefined) {
      zona.poligono = normalizado.poligono ?? null;
    }
    if (data.barrio_nombre !== undefined || data.tipo !== undefined) {
      zona.barrio_nombre = normalizado.barrio_nombre ?? null;
    }
    if (data.origen_limites !== undefined || data.tipo !== undefined) {
      zona.origen_limites = normalizado.origen_limites ?? null;
    }
    if (data.color !== undefined) zona.color = data.color.trim() || zona.color;
    if (data.repartidor !== undefined) {
      zona.repartidor = data.repartidor?.trim() || null;
    }
    if (data.activo !== undefined) zona.activo = Boolean(data.activo);

    return this.repo.save(zona);
  }

  async eliminar(id: number): Promise<void> {
    const zona = await this.obtenerPorId(id);
    zona.activo = false;
    await this.repo.save(zona);
  }

  async limitesBarrio(barrio: string) {
    return resolverLimitesBarrio(barrio);
  }
}
