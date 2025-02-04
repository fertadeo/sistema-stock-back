import { Request, Response } from 'express';
import { Productos } from '../entities/Productos';
import { AppDataSource } from '../config/database'; // Configura tu datasource de TypeORM



// Controlador para importar productos (sin modificaciones)
export const importarProductos = async (req: Request, res: Response) => {
  const productos = req.body;
  console.log('Datos recibidos:', productos);

  if (!Array.isArray(productos)) {
    return res.status(400).json({ message: 'Formato de datos incorrecto. Se esperaba un array de productos.' });
  }

  try {
    for (const producto of productos) {
      const nuevoProducto = new Productos();
      nuevoProducto.id = producto.id;
      nuevoProducto.nombreProducto = producto.Producto;
      nuevoProducto.precioPublico = producto.PrecioPublico;
      nuevoProducto.precioRevendedor = producto.PrecioRevendedor;




      console.log('Guardando producto:', nuevoProducto);

      await AppDataSource.getRepository(Productos).save(nuevoProducto);
    }


    return res.status(200).json({ message: 'Productos importados correctamente' });
  } catch (error) {
    console.error('Error al importar productos:', error);
    return res.status(500).json({ message: 'Error al importar productos en la base de datos' });
  }
};

// Obtén el repositorio del producto
const productoRepository = AppDataSource.getRepository(Productos);


// Función para obtener todos los productos
export const obtenerTodosLosProductos = async (req: Request, res: Response) => {
  try {
    const productos = await productoRepository.find();
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener todos los productos:', error);
    res.status(500).json({ message: 'Error al obtener todos los productos' });
  }
};

// Función para obtener un producto por ID
export const obtenerProductoPorId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const productId = Number(id);
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ message: 'ID de producto inválido' });
  }

  try {
    const producto = await productoRepository.findOne({
      where: { id: productId },
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const resultado = {
      id: producto.id,
      nombreProducto: producto.nombreProducto,
      precioPublico: producto.precioPublico,
      precioRevendedor: producto.precioRevendedor,
    };


    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).json({ message: 'Error al obtener el producto' });
  }

  console.log('ID recibido:', id);
};



// export const obtenerProductosPorProveedor = async (req: Request, res: Response) => {
//   const { proveedor_id } = req.params;

//   const proveedorId = Number(proveedor_id);
//   if (isNaN(proveedorId) || proveedorId <= 0) {
//     return res.status(400).json({ message: 'ID de proveedor inválido' });
//   }

  
// };

// Nueva función para obtener el último ID de los productos
export const obtenerUltimoIdProducto = async (req: Request, res: Response) => {
  try {
    // Obtener el producto con el ID más alto
    const ultimoProducto = await productoRepository
      .createQueryBuilder('producto')
      .orderBy('producto.id', 'DESC')
      .getOne();

    if (!ultimoProducto) {
      return res.status(404).json({ message: 'No se encontraron productos' });
    }

    // Retornar el ID más alto
    return res.json({ ultimoId: ultimoProducto.id });
  
  } catch (error) {
    console.error('Error al obtener el último ID de producto:', error);
    return res.status(500).json({ message: 'Error al obtener el último ID de producto' });
  }
};



// Función para actualizar un producto existente
export const actualizarProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombreProducto, cantidad_stock, precio, disponible } = req.body;


  const productId = Number(id);
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ message: 'ID de producto inválido' });
  }

  try {
    const producto = await productoRepository.findOne({ where: { id: productId } });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    producto.nombreProducto = nombreProducto ?? producto.nombreProducto;
    producto.precioPublico =  producto.precioPublico;
    producto.precioRevendedor =  producto.precioRevendedor;


    await productoRepository.save(producto);

    return res.status(200).json({ message: 'Producto actualizado correctamente', producto });
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    res.status(500).json({ message: 'Error al actualizar el producto' });
  }
};


export const actualizarPreciosPorProveedor = async (req: Request, res: Response) => {
  const productosActualizados = req.body;

  if (!Array.isArray(productosActualizados)) {
    return res.status(400).json({ message: 'Se esperaba un array de productos para actualizar' });
  }

  try {
    for (const productoActualizado of productosActualizados) {
      const { id, Precio } = productoActualizado;

      // Validar que el producto tenga un ID y un precio válido
      if (!id || typeof Precio !== 'string') {
        console.error(`Producto inválido: ${JSON.stringify(productoActualizado)}`);
        continue;
      }

      // Buscar el producto por ID
      const producto = await productoRepository.findOne({ where: { id } });

      if (!producto) {
        console.warn(`Producto con ID ${id} no encontrado`);
        continue;
      }

      // Actualizar el precio del producto
      // producto.precio = Precio;

      // Guardar los cambios en la base de datos
      // await productoRepository.save(producto);
    }

    return res.status(200).json({ message: 'Precios actualizados correctamente' });
  } catch (error) {
    console.error('Error al actualizar precios:', error);
    return res.status(500).json({ message: 'Error al actualizar precios' });
  }
};



// Controlador para crear un nuevo producto
export const crearProducto = async (req: Request, res: Response) => {
  const {
    id,
    nombreProducto,
    precioPublico,
    precioRevendedor,

  } = req.body;

  try {
    // Crear una instancia de producto
    const nuevoProducto = new Productos();
    nuevoProducto.id = id;
    nuevoProducto.nombreProducto = nombreProducto;
    nuevoProducto.precioPublico = precioPublico;
    nuevoProducto.precioRevendedor = precioRevendedor;



    // Guardar el nuevo producto en la base de datos
    await AppDataSource.getRepository(Productos).save(nuevoProducto);

    return res.status(201).json({ message: 'Producto creado exitosamente', producto: nuevoProducto });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return res.status(500).json({ message: 'Error al crear el producto' });
  }
};