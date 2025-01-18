import { Request, Response } from 'express';
import { clientesService } from '../services/clienteService';
import { Clientes } from '../entities/Clientes';
import { AppDataSource } from '../config/database';

const clienteRepository = AppDataSource.getRepository(Clientes);

export const getClientes = async (req: Request, res: Response) => {
  try {
    const clientes = await clientesService.getAllClientes();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los clientes' });
    console.log(error);
  }
};




export const getClientesPorMes = async (req: Request, res: Response) => {
  try {
      const query = `
          SELECT 
              MONTH(fecha_registro) AS mes, 
              COUNT(*) AS cantidad 
          FROM clientes
          GROUP BY MONTH(fecha_registro)
          ORDER BY mes;
      `;

      const result = await AppDataSource.query(query);
      res.json(result);
  } catch (error) {
      console.error(error); 
      res.status(500).json({ error: 'Error al obtener los clientes por mes' });
  }
};

export const getNextClienteId = async (req: Request, res: Response) => {
  try {
    // Encuentra el último cliente ordenado por ID descendente, limitando a 1 resultado
    const [ultimoCliente] = await clienteRepository.find({
      order: { id: "DESC" },
      take: 1, // Limita el resultado a un registro
    });

    // Si no hay clientes, el próximo ID será 1
    const nextId = ultimoCliente ? ultimoCliente.id + 1 : 1;

    res.json({ nextId });
  } catch (error) {
    console.error('Error al calcular el próximo ID de cliente:', error);
    res.status(500).json({ message: 'Error al calcular el próximo ID de cliente' });
  }
};


export const createCliente = async (req: Request, res: Response) => {
  try {
    const nuevoCliente = req.body;
    
    // Si el DNI está vacío o no se proporciona, no lo verifiques
    if (nuevoCliente.dni) {
      const clienteExistente = await clienteRepository.findOne({
        where: { dni: nuevoCliente.dni }
      });

      if (clienteExistente) {
        return res.status(400).json({ message: 'El cliente con este DNI ya existe' });
      }
    }

    const clienteCreado = await clienteRepository.save(nuevoCliente);
    res.status(201).json(clienteCreado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el cliente' });
  }
};

export const updateCliente = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const clienteData: Partial<Clientes> = req.body;

  try {
    const clienteActualizado = await clientesService.updateCliente(id, clienteData);
    if (!clienteActualizado) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(clienteActualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el cliente' });
    console.log(error);
  }
};

export const deleteCliente = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    await clientesService.deleteCliente(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el cliente:', error);
    res.status(500).json({ message: 'Error al eliminar el cliente' });
  }
};
