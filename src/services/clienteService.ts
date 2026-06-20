import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Venta } from '../entities/Venta';
import { clienteVinculacionService } from './clienteVinculacionService';

const clienteRepository = AppDataSource.getRepository(Clientes);
const ventaRepository = AppDataSource.getRepository(Venta);

/** Puntuación de relevancia para búsqueda */
const PUNTUACION = {
  NOMBRE_EMPIEZA: 10,
  NOMBRE_CONTIENE: 5,
  TELEFONO_CONTIENE: 4,
  DIRECCION_CONTIENE: 3,
  PALABRA_COINCIDE: 2,
} as const;

/**
 * Calcula la puntuación de relevancia de un cliente respecto al término de búsqueda.
 * Mayor puntuación = más relevante.
 */
function calcularPuntuacionRelevancia(cliente: any, termino: string): number {
  if (!termino || termino.length < 2) return 0;

  const t = termino.toLowerCase().trim();
  const nombre = (cliente.nombre || '').toLowerCase();
  const telefono = (cliente.telefono || '').toString();
  const direccion = (cliente.direccion || '').toLowerCase();

  let puntuacion = 0;

  // Nombre empieza con lo escrito → 10
  if (nombre.startsWith(t)) {
    puntuacion = Math.max(puntuacion, PUNTUACION.NOMBRE_EMPIEZA);
  }

  // Nombre contiene lo escrito → 5
  if (nombre.includes(t)) {
    puntuacion = Math.max(puntuacion, PUNTUACION.NOMBRE_CONTIENE);
  }

  // Teléfono contiene lo escrito → 4
  if (telefono.includes(t)) {
    puntuacion = Math.max(puntuacion, PUNTUACION.TELEFONO_CONTIENE);
  }

  // Dirección contiene lo escrito → 3
  if (direccion.includes(t)) {
    puntuacion = Math.max(puntuacion, PUNTUACION.DIRECCION_CONTIENE);
  }

  // Alguna palabra del nombre empieza con lo escrito (o al revés) → 2
  const palabrasNombre: string[] = nombre.split(/\s+/).filter(Boolean);
  const coincidePalabra = palabrasNombre.some(
    (p) => p.startsWith(t) || t.startsWith(p)
  );
  if (coincidePalabra) {
    puntuacion = Math.max(puntuacion, PUNTUACION.PALABRA_COINCIDE);
  }

  return puntuacion;
}

/**
 * Transforma un cliente de la entidad al formato esperado por el frontend.
 */
async function transformarCliente(
  cliente: Clientes,
  opciones: { incluirVinculacion?: boolean } = {}
): Promise<any> {
  const incluirVinculacion = opciones.incluirVinculacion ?? true;

  const transformado: any = {
    id: cliente.id,
    dni: cliente.dni,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    latitud: cliente.latitud,
    longitud: cliente.longitud,
    fecha_alta: cliente.fecha_alta,
    estado: cliente.estado,
    repartidor: cliente.repartidor,
    dia_reparto: cliente.dia_reparto,
    cliente_vinculado_id: cliente.cliente_vinculado_id ?? null,
    envases_prestados: cliente.envases_prestados || [],
  };
  if (cliente.zona) {
    transformado.zona = cliente.zona.id;
  }

  if (incluirVinculacion && cliente.cliente_vinculado_id) {
    try {
      const vinculado = await clienteVinculacionService.obtenerVinculado(cliente.id);
      transformado.cliente_vinculado = vinculado;

      const domicilio = await clienteVinculacionService.obtenerResumenDomicilio(cliente.id);
      transformado.resumen_domicilio = domicilio;
    } catch {
      transformado.cliente_vinculado = null;
      transformado.resumen_domicilio = null;
    }
  } else {
    transformado.cliente_vinculado = null;
    transformado.resumen_domicilio = null;
  }

  return transformado;
}

export const clientesService = {
  /**
   * Busca clientes por término con puntuación de relevancia.
   * Ordena resultados por puntuación (más relevantes primero).
   */
  searchClientes: async (search: string): Promise<any[]> => {
    const termino = (search || '').trim();
    if (termino.length < 2) {
      return [];
    }

    const clientes = await clienteRepository.find({
      relations: ['envases_prestados', 'zona'],
    });

    const conPuntuacion = clientes
      .map((cliente) => {
        const puntuacion = calcularPuntuacionRelevancia({
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          direccion: cliente.direccion
        }, termino);
        return { cliente, puntuacion };
      })
      .filter((item) => item.puntuacion > 0)
      .sort((a, b) => b.puntuacion - a.puntuacion);

    const resultados = await Promise.all(
      conPuntuacion.map((item) => transformarCliente(item.cliente, { incluirVinculacion: false }))
    );

    return resultados;
  },

  getClienteById: async (id: number): Promise<any | null> => {
    const cliente = await clienteRepository.findOne({
      where: { id },
      relations: ['envases_prestados', 'zona'],
    });

    if (!cliente) {
      return null;
    }

    const historial_ventas = await ventaRepository.find({
      where: { cliente_id: id.toString() },
      order: { fecha_venta: 'DESC' },
    });

    const transformado = await transformarCliente(cliente);
    transformado.historial_ventas = historial_ventas;
    return transformado;
  },

  getAllClientes: async (): Promise<any[]> => {
    const clientes = await clienteRepository.find({
      relations: ['envases_prestados', 'zona'],
    });
    return Promise.all(
      clientes.map((cliente) => transformarCliente(cliente, { incluirVinculacion: false }))
    );
  },

  createCliente: async (clienteData: Partial<Clientes>): Promise<Clientes> => {
    // Verificar si el cliente ya existe por DNI
    const clienteExistente = await clienteRepository.findOne({ where: { dni: clienteData.dni } });
    if (clienteExistente) {
      throw new Error('El cliente con este DNI ya existe');
    }

    // Si no existe, proceder con la creación
    const cliente = clienteRepository.create(clienteData);
    return await clienteRepository.save(cliente);
  },

  updateCliente: async (id: number, clienteData: Partial<Clientes>): Promise<Clientes | undefined> => {
    try {
      const clienteToUpdate = await clienteRepository.findOneBy({ id });

      if (!clienteToUpdate) {
        throw new Error(`Cliente with ID ${id} not found`);
      }

      Object.assign(clienteToUpdate, clienteData);

      return await clienteRepository.save(clienteToUpdate);
    } catch (error) {
      console.error('Error updating cliente:', error);
      throw error;
    }
  },

  deleteCliente: async (id: number): Promise<void> => {
    try {
      const clienteToDelete = await clienteRepository.findOneBy({ id });

      if (!clienteToDelete) {
        throw new Error(`Cliente with ID ${id} not found`);
      }

      await clienteRepository.remove(clienteToDelete);
    } catch (error) {
      console.error('Error deleting cliente:', error);
      throw error;
    }
  },
};
