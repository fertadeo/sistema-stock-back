import { AppDataSource } from '../config/database';
import { ConfiguracionSistema } from '../entities/ConfiguracionSistema';

const CONFIG_ID = 1;

export type ConfiguracionSistemaDto = {
  repartidor_solo_clientes_propios: boolean;
  actualizado_at: string | null;
};

let cache: ConfiguracionSistemaDto | null = null;

const toDto = (row: ConfiguracionSistema): ConfiguracionSistemaDto => ({
  repartidor_solo_clientes_propios: Boolean(row.repartidor_solo_clientes_propios),
  actualizado_at: row.actualizado_at ? new Date(row.actualizado_at).toISOString() : null,
});

const ensureRow = async (): Promise<ConfiguracionSistema> => {
  const repo = AppDataSource.getRepository(ConfiguracionSistema);
  let row = await repo.findOneBy({ id: CONFIG_ID });

  if (!row) {
    row = repo.create({
      id: CONFIG_ID,
      repartidor_solo_clientes_propios: false,
    });
    row = await repo.save(row);
  }

  return row;
};

export const obtenerConfiguracionSistema = async (
  forceRefresh = false
): Promise<ConfiguracionSistemaDto> => {
  if (!forceRefresh && cache) {
    return cache;
  }

  const row = await ensureRow();
  cache = toDto(row);
  return cache;
};

export const actualizarConfiguracionSistema = async (payload: {
  repartidor_solo_clientes_propios?: boolean;
}): Promise<ConfiguracionSistemaDto> => {
  const repo = AppDataSource.getRepository(ConfiguracionSistema);
  const row = await ensureRow();

  if (typeof payload.repartidor_solo_clientes_propios === 'boolean') {
    row.repartidor_solo_clientes_propios = payload.repartidor_solo_clientes_propios;
  }

  const saved = await repo.save(row);
  cache = toDto(saved);
  return cache;
};

export const invalidarCacheConfiguracionSistema = () => {
  cache = null;
};
