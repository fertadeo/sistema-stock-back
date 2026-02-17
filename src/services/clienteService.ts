import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
const clienteRepository = AppDataSource.getRepository(Clientes);
export const clientesService = {
  getClienteById: async (id: number): Promise<any | null> => {
    const cliente = await clienteRepository.findOne({
      where: { id },
      relations: ['envases_prestados', 'zona']
    });

    if (!cliente) {
      return null;
    }

    const clienteTransformado: any = {
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
      envases_prestados: cliente.envases_prestados || []
    };

    if (cliente.zona) {
      clienteTransformado.zona = cliente.zona.id;
    }

    return clienteTransformado;
  },

  getAllClientes: async (): Promise<any[]> => {
    const clientes = await clienteRepository.find({
      relations: ['envases_prestados', 'zona']
    });
    
    // Transformar la respuesta para mantener compatibilidad con el frontend
    return clientes.map(cliente => {
      // Crear un nuevo objeto con los datos del cliente
      const clienteTransformado: any = {
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
        envases_prestados: cliente.envases_prestados || []
      };
      
      // Extraer solo el id de la zona si existe
      if (cliente.zona) {
        clienteTransformado.zona = cliente.zona.id;
      }
      
      return clienteTransformado;
    });
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
