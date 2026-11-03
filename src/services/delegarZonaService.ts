import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Repartidor } from '../entities/Repartidor';
import { ZonaRadio } from '../entities/ZonaRadio';
import { coincideRepartidorNombre } from '../utils/repartidorClienteAccess';

export class DelegarZonaService {
  private clienteRepo = AppDataSource.getRepository(Clientes);
  private repartidorRepo = AppDataSource.getRepository(Repartidor);
  private zonaRepo = AppDataSource.getRepository(ZonaRadio);

  async delegarZona(input: {
    zona_id?: number | null;
    /** Opcional: si viene, valida que todos los clientes pertenezcan a ese origen. */
    repartidor_origen?: string | null;
    repartidor_destino: string;
    cliente_ids: number[];
  }) {
    const origenNombre = (input.repartidor_origen || '').trim();
    const destinoNombre = (input.repartidor_destino || '').trim();

    if (!destinoNombre) {
      throw new Error('El repartidor destino es obligatorio');
    }
    if (!Array.isArray(input.cliente_ids) || input.cliente_ids.length === 0) {
      throw new Error('Debés seleccionar al menos un cliente');
    }

    const destino = await this.repartidorRepo
      .createQueryBuilder('r')
      .where('LOWER(TRIM(r.nombre)) = LOWER(:nombre)', { nombre: destinoNombre })
      .andWhere('r.activo = :activo', { activo: true })
      .getOne();
    if (!destino) {
      throw new Error(`Repartidor destino "${destinoNombre}" no encontrado`);
    }

    const ids = Array.from(
      new Set(input.cliente_ids.map((id) => Number(id)).filter((id) => id > 0))
    );
    const clientes = await this.clienteRepo.find({ where: { id: In(ids) } });

    if (clientes.length !== ids.length) {
      throw new Error('Algunos clientes no existen');
    }

    if (origenNombre) {
      if (origenNombre.toLowerCase() === destinoNombre.toLowerCase()) {
        throw new Error('El repartidor origen y destino deben ser distintos');
      }
      const invalidos = clientes.filter(
        (c) => !coincideRepartidorNombre(c.repartidor, origenNombre)
      );
      if (invalidos.length > 0) {
        throw new Error(
          `${invalidos.length} cliente(s) no pertenecen a ${origenNombre}`
        );
      }
    }

    const aMigrar = clientes.filter(
      (c) => !coincideRepartidorNombre(c.repartidor, destino.nombre)
    );
    if (aMigrar.length === 0) {
      throw new Error('Los clientes seleccionados ya pertenecen al repartidor destino');
    }

    const origenes = Array.from(
      new Set(
        aMigrar
          .map((c) => (c.repartidor || '').trim())
          .filter((nombre) => nombre.length > 0)
      )
    );

    for (const cliente of aMigrar) {
      cliente.repartidor = destino.nombre;
    }
    await this.clienteRepo.save(aMigrar);

    let zonaActualizada: ZonaRadio | null = null;
    if (input.zona_id) {
      const zona = await this.zonaRepo.findOne({ where: { id: Number(input.zona_id) } });
      if (zona) {
        const zonaRep = (zona.repartidor || '').trim();
        const debeActualizarZona =
          !zonaRep ||
          (origenNombre
            ? coincideRepartidorNombre(zonaRep, origenNombre)
            : origenes.some((o) => coincideRepartidorNombre(zonaRep, o)));
        if (debeActualizarZona) {
          zona.repartidor = destino.nombre;
          zonaActualizada = await this.zonaRepo.save(zona);
        }
      }
    }

    const origen =
      origenNombre
        ? await this.repartidorRepo
            .createQueryBuilder('r')
            .where('LOWER(TRIM(r.nombre)) = LOWER(:nombre)', { nombre: origenNombre })
            .getOne()
        : null;

    return {
      cantidad: aMigrar.length,
      origenes,
      origen: origen
        ? { id: origen.id, nombre: origen.nombre }
        : origenNombre
          ? { nombre: origenNombre }
          : null,
      destino: {
        id: destino.id,
        nombre: destino.nombre,
        color_pin: destino.color_pin,
      },
      cliente_ids: aMigrar.map((c) => c.id),
      zona: zonaActualizada
        ? { id: zonaActualizada.id, repartidor: zonaActualizada.repartidor }
        : null,
    };
  }
}

export const delegarZonaService = new DelegarZonaService();
