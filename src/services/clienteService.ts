import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Pedido } from '../entities/Pedido';

const clienteRepository = AppDataSource.getRepository(Clientes);
const pedidoRepository = AppDataSource.getRepository(Pedido);

export const clientesService = {
  getAllClientes: async (): Promise<Clientes[]> => {
    return await clienteRepository.find();
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
      // Eliminar pedidos asociados al cliente
      await pedidoRepository.delete({ cliente: { id } });

      // Ahora se puede eliminar el cliente
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
