import { Request, Response } from 'express';
import { clientesService } from '../services/clienteService';
import { Clientes } from '../entities/Clientes';
import { AppDataSource } from '../config/database';
import { EnvasesPrestados } from '../entities/EnvasesPrestados';

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
    const { envases_prestados, ...datosCliente } = req.body;
    
    // Verificación del DNI si existe
    if (datosCliente.dni) {
      const clienteExistente = await clienteRepository.findOne({
        where: { dni: datosCliente.dni }
      });

      if (clienteExistente) {
        return res.status(400).json({ message: 'El cliente con este DNI ya existe' });
      }
    }

    // Crear el cliente
    const clienteCreado = await clienteRepository.save(datosCliente);

    // Si hay envases prestados, los registramos
    if (envases_prestados && Array.isArray(envases_prestados) && envases_prestados.length > 0) {
      const envaseRepository = AppDataSource.getRepository(EnvasesPrestados);
      
      const envasesARegistrar = envases_prestados.map(envase => ({
        cliente_id: clienteCreado.id,
        tipo_producto: envase.tipo_producto,
        capacidad: envase.capacidad,
        cantidad: envase.cantidad
      }));

      await envaseRepository.save(envasesARegistrar);
    }

    // Obtener el cliente con sus envases prestados
    const clienteConEnvases = await clienteRepository.findOne({
      where: { id: clienteCreado.id },
      relations: ['envases_prestados']
    });

    res.status(201).json(clienteConEnvases);
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

export const prestarEnvases = async (req: Request, res: Response) => {
    try {
        const { cliente_id, tipo_producto, capacidad, cantidad } = req.body;

        // Verificar que el cliente existe
        const cliente = await clienteRepository.findOne({
            where: { id: cliente_id }
        });

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const envasesPrestados = new EnvasesPrestados();
        envasesPrestados.cliente_id = cliente_id;
        envasesPrestados.tipo_producto = tipo_producto;
        envasesPrestados.capacidad = capacidad;
        envasesPrestados.cantidad = cantidad;

        const resultado = await AppDataSource
            .getRepository(EnvasesPrestados)
            .save(envasesPrestados);

        res.status(201).json(resultado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar los envases prestados' });
    }
};

export const getEnvasesPrestadosPorCliente = async (req: Request, res: Response) => {
    try {
        const cliente_id = parseInt(req.params.id);
        
        const envases = await AppDataSource
            .getRepository(EnvasesPrestados)
            .find({
                where: { cliente_id },
                order: { fecha_prestamo: 'DESC' }
            });

        res.json(envases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los envases prestados' });
    }
};
