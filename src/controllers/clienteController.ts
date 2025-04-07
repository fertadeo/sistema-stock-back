import { Request, Response } from 'express';
import { clientesService } from '../services/clienteService';
import { Clientes } from '../entities/Clientes';
import { AppDataSource } from '../config/database';
import { EnvasesPrestados } from '../entities/EnvasesPrestados';
import { Zona } from '../entities/Zona';
import { Productos } from '../entities/Productos';

interface EnvasePrestado {
  producto_id: number;
  producto_nombre: string;
  capacidad: number;
  cantidad: number;
}

const clienteRepository = AppDataSource.getRepository(Clientes);
const zonaRepository = AppDataSource.getRepository(Zona);
const productoRepository = AppDataSource.getRepository(Productos);

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

export const getZonas = async (req: Request, res: Response) => {
  try {
    const zonas = await zonaRepository.find();
    res.json(zonas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener las zonas' });
  }
};

export const createCliente = async (req: Request, res: Response) => {
  try {
    const { envases_prestados, zona, ...datosCliente } = req.body;

    // Validación de estructura básica del request
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: 'Error en la creación del cliente',
        error: 'No se recibieron datos',
        ejemploFormato: {
          dni: "string (opcional)",
          nombre: "string (opcional)",
          email: "string (opcional)",
          telefono: "string (opcional)",
          direccion: "string (opcional)",
          zona: "number (opcional)",
          repartidor: "string (opcional)",
          dia_reparto: "string (opcional)",
          envases_prestados: "array (opcional)"
        }
      });
    }

    // Si se incluyen envases prestados, validar su estructura
    if (envases_prestados !== undefined) {
      if (!Array.isArray(envases_prestados)) {
        return res.status(400).json({
          message: 'Error en la creación del cliente',
          error: 'envases_prestados debe ser un array',
          ejemploEnvasesPrestados: [{
            producto_id: "number (requerido si se incluyen envases)",
            producto_nombre: "string (requerido si se incluyen envases)",
            capacidad: "number (requerido si se incluyen envases)",
            cantidad: "number (requerido si se incluyen envases)"
          }]
        });
      }

      // Validar cada envase prestado
      for (const envase of envases_prestados) {
        if (!envase.producto_id || !envase.producto_nombre || !envase.capacidad || !envase.cantidad) {
          return res.status(400).json({
            message: 'Error en la creación del cliente',
            error: 'Datos incompletos en envases_prestados',
            envaseConError: envase,
            ejemploEnvase: {
              producto_id: "number (requerido)",
              producto_nombre: "string (requerido)",
              capacidad: "number (requerido)",
              cantidad: "number (requerido)"
            }
          });
        }

        // Verificar que el producto existe y coincide
        const producto = await productoRepository.findOne({
          where: { id: envase.producto_id }
        });

        if (!producto) {
          return res.status(400).json({
            message: 'Error en la creación del cliente',
            error: `El producto con ID ${envase.producto_id} no existe`,
            productoInvalido: {
              id: envase.producto_id,
              nombre: envase.producto_nombre
            },
            sugerencia: "Verificar el ID del producto usando GET /api/productos"
          });
        }

        if (producto.nombreProducto !== envase.producto_nombre) {
          return res.status(400).json({
            message: 'Error en la creación del cliente',
            error: 'El nombre del producto no coincide con el registrado',
            productoEnviado: {
              id: envase.producto_id,
              nombre: envase.producto_nombre
            },
            productoEnBaseDeDatos: {
              id: producto.id,
              nombre: producto.nombreProducto
            }
          });
        }
      }
    }

    // Si se incluye zona, verificar que existe
    if (zona !== undefined) {
      const zonaExistente = await zonaRepository.findOne({
        where: { id: zona }
      });

      if (!zonaExistente) {
        return res.status(400).json({
          message: 'Error en la creación del cliente',
          error: 'La zona especificada no existe',
          zonaInvalida: zona,
          sugerencia: "Verificar el ID de la zona usando GET /api/zonas"
        });
      }
    }

    // Verificación del DNI si se incluye
    if (datosCliente.dni) {
      const clienteExistente = await clienteRepository.findOne({
        where: { dni: datosCliente.dni }
      });

      if (clienteExistente) {
        return res.status(400).json({
          message: 'Error en la creación del cliente',
          error: 'Ya existe un cliente con este DNI',
          dniDuplicado: datosCliente.dni,
          clienteExistente: {
            id: clienteExistente.id,
            nombre: clienteExistente.nombre
          }
        });
      }
    }

    // Crear el cliente
    const clienteCreado = await clienteRepository.save({
      ...datosCliente,
      zona
    });

    // Registrar envases prestados si existen
    if (envases_prestados?.length > 0) {
      const envaseRepository = AppDataSource.getRepository(EnvasesPrestados);
      const envasesARegistrar = envases_prestados.map((envase: EnvasePrestado) => ({
        cliente_id: clienteCreado.id,
        producto_id: envase.producto_id,
        producto_nombre: envase.producto_nombre,
        capacidad: envase.capacidad,
        cantidad: envase.cantidad
      }));

      await envaseRepository.save(envasesARegistrar);
    }

    // Obtener el cliente con sus relaciones
    const clienteConRelaciones = await clienteRepository.findOne({
      where: { id: clienteCreado.id },
      relations: ['envases_prestados', 'zona']
    });

    res.status(201).json(clienteConRelaciones);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({
      message: 'Error interno al crear el cliente',
      error: error instanceof Error ? error.message : 'Error desconocido',
      formatoEsperado: {
        dni: "string (opcional)",
        nombre: "string (opcional)",
        email: "string (opcional)",
        telefono: "string (opcional)",
        direccion: "string (opcional)",
        zona: "number (opcional)",
        repartidor: "string (opcional)",
        dia_reparto: "string (opcional)",
        envases_prestados: [
          {
            producto_id: "number (requerido si se incluyen envases)",
            producto_nombre: "string (requerido si se incluyen envases)",
            capacidad: "number (requerido si se incluyen envases)",
            cantidad: "number (requerido si se incluyen envases)"
          }
        ]
      }
    });
  }
};

export const updateCliente = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { envases_prestados, zona, ...datosCliente } = req.body;

  try {
    // Verificar que el cliente existe
    const clienteExistente = await clienteRepository.findOne({
      where: { id },
      relations: ['envases_prestados', 'zona']
    });

    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Si se incluyen envases prestados, validar su estructura
    if (envases_prestados !== undefined) {
      if (!Array.isArray(envases_prestados)) {
        return res.status(400).json({
          message: 'Error en la actualización del cliente',
          error: 'envases_prestados debe ser un array',
          ejemploEnvasesPrestados: [{
            producto_id: "number (requerido si se incluyen envases)",
            producto_nombre: "string (requerido si se incluyen envases)",
            capacidad: "number (requerido si se incluyen envases)",
            cantidad: "number (requerido si se incluyen envases)"
          }]
        });
      }

      // Validar cada envase prestado
      for (const envase of envases_prestados) {
        if (!envase.producto_id || !envase.producto_nombre || !envase.capacidad || !envase.cantidad) {
          return res.status(400).json({
            message: 'Error en la actualización del cliente',
            error: 'Datos incompletos en envases_prestados',
            envaseConError: envase,
            ejemploEnvase: {
              producto_id: "number (requerido)",
              producto_nombre: "string (requerido)",
              capacidad: "number (requerido)",
              cantidad: "number (requerido)"
            }
          });
        }

        // Verificar que el producto existe y coincide
        const producto = await productoRepository.findOne({
          where: { id: envase.producto_id }
        });

        if (!producto) {
          return res.status(400).json({
            message: 'Error en la actualización del cliente',
            error: `El producto con ID ${envase.producto_id} no existe`,
            productoInvalido: {
              id: envase.producto_id,
              nombre: envase.producto_nombre
            },
            sugerencia: "Verificar el ID del producto usando GET /api/productos"
          });
        }

        if (producto.nombreProducto !== envase.producto_nombre) {
          return res.status(400).json({
            message: 'Error en la actualización del cliente',
            error: 'El nombre del producto no coincide con el registrado',
            productoEnviado: {
              id: envase.producto_id,
              nombre: envase.producto_nombre
            },
            productoEnBaseDeDatos: {
              id: producto.id,
              nombre: producto.nombreProducto
            }
          });
        }
      }
    }

    // Si se incluye zona, verificar que existe
    if (zona !== undefined) {
      const zonaExistente = await zonaRepository.findOne({
        where: { id: zona }
      });

      if (!zonaExistente) {
        return res.status(400).json({
          message: 'Error en la actualización del cliente',
          error: 'La zona especificada no existe',
          zonaInvalida: zona,
          sugerencia: "Verificar el ID de la zona usando GET /api/zonas"
        });
      }
    }

    // Verificación del DNI si se incluye y es diferente al actual
    if (datosCliente.dni && datosCliente.dni !== clienteExistente.dni) {
      const clienteConMismoDNI = await clienteRepository.findOne({
        where: { dni: datosCliente.dni }
      });

      if (clienteConMismoDNI && clienteConMismoDNI.id !== id) {
        return res.status(400).json({
          message: 'Error en la actualización del cliente',
          error: 'Ya existe un cliente con este DNI',
          dniDuplicado: datosCliente.dni,
          clienteExistente: {
            id: clienteConMismoDNI.id,
            nombre: clienteConMismoDNI.nombre
          }
        });
      }
    }

    // Actualizar el cliente
    const clienteActualizado = await clientesService.updateCliente(id, {
      ...datosCliente,
      zona
    });

    // Actualizar envases prestados si existen
    if (envases_prestados !== undefined) {
      const envaseRepository = AppDataSource.getRepository(EnvasesPrestados);
      
      // Eliminar envases prestados existentes
      await envaseRepository.delete({ cliente_id: id });
      
      // Registrar nuevos envases prestados si hay alguno
      if (envases_prestados.length > 0) {
        const envasesARegistrar = envases_prestados.map((envase: EnvasePrestado) => ({
          cliente_id: id,
          producto_id: envase.producto_id,
          producto_nombre: envase.producto_nombre,
          capacidad: envase.capacidad,
          cantidad: envase.cantidad
        }));

        await envaseRepository.save(envasesARegistrar);
      }
    }

    // Obtener el cliente actualizado con sus relaciones
    const clienteConRelaciones = await clienteRepository.findOne({
      where: { id },
      relations: ['envases_prestados', 'zona']
    });

    res.json(clienteConRelaciones);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ 
      message: 'Error al actualizar el cliente',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteCliente = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    // Primero eliminamos los envases prestados asociados al cliente
    const envaseRepository = AppDataSource.getRepository(EnvasesPrestados);
    await envaseRepository.delete({ cliente_id: id });

    // Luego eliminamos el cliente
    await clientesService.deleteCliente(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el cliente:', error);
    res.status(500).json({ message: 'Error al eliminar el cliente' });
  }
};

export const prestarEnvases = async (req: Request, res: Response) => {
    try {
        const { cliente_id, producto_id, producto_nombre, capacidad, cantidad } = req.body;

        // Verificar que el cliente existe
        const cliente = await clienteRepository.findOne({
            where: { id: cliente_id }
        });

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        
        // Verificar que el producto existe y el nombre coincide
        const producto = await productoRepository.findOne({
            where: { id: producto_id }
        });
        
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        if (producto.nombreProducto !== producto_nombre) {
            return res.status(400).json({ 
                message: 'El nombre del producto no coincide con el registrado en la base de datos' 
            });
        }

        const envasesPrestados = new EnvasesPrestados();
        envasesPrestados.cliente_id = cliente_id;
        envasesPrestados.producto_id = producto_id;
        envasesPrestados.producto_nombre = producto_nombre;
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
