import { AppDataSource } from '../config/database';
import { ZonaRadio } from '../entities/ZonaRadio';

export type ZonaRadioInput = {
  nombre: string;
  latitud: number;
  longitud: number;
  radio_metros: number;
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

function validarInput(data: Partial<ZonaRadioInput>, parcial = false): void {
  if (!parcial || data.nombre !== undefined) {
    if (!data.nombre || !String(data.nombre).trim()) {
      throw new Error('El nombre de la zona es obligatorio');
    }
  }

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
    validarInput(data);
    const existentes = await this.repo.count();
    const zona = this.repo.create({
      nombre: data.nombre.trim(),
      latitud: Number(data.latitud),
      longitud: Number(data.longitud),
      radio_metros: Math.round(Number(data.radio_metros)),
      color: data.color?.trim() || colorPorIndice(existentes),
      repartidor: data.repartidor?.trim() || null,
      activo: data.activo !== false,
    });
    return this.repo.save(zona);
  }

  async actualizar(id: number, data: Partial<ZonaRadioInput>): Promise<ZonaRadio> {
    validarInput(data, true);
    const zona = await this.obtenerPorId(id);

    if (data.nombre !== undefined) zona.nombre = data.nombre.trim();
    if (data.latitud !== undefined) zona.latitud = Number(data.latitud);
    if (data.longitud !== undefined) zona.longitud = Number(data.longitud);
    if (data.radio_metros !== undefined) {
      zona.radio_metros = Math.round(Number(data.radio_metros));
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
}
