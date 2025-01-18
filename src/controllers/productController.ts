import { Request, Response } from 'express';
import { Producto } from '../entities/Producto';
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
      const nuevoProducto = new Producto();
      nuevoProducto.id = producto.id;
      nuevoProducto.nombreProducto = producto.Producto;
      nuevoProducto.cantidad_stock = producto.Cantidad_stock;
      nuevoProducto.descripcion = producto.Descripción;
      nuevoProducto.precioCosto = producto.PrecioCosto;
      nuevoProducto.precio = producto.Precio;
      nuevoProducto.divisa = producto.Divisa;
      nuevoProducto.descuento = parseFloat(producto.Descuento.replace('%', ''));
      nuevoProducto.proveedor_id = producto.proveedor_id; 

      console.log('Guardando producto:', nuevoProducto);

      await AppDataSource.getRepository(Producto).save(nuevoProducto);
    }

    return res.status(200).json({ message: 'Productos importados correctamente' });
  } catch (error) {
    console.error('Error al importar productos:', error);
    return res.status(500).json({ message: 'Error al importar productos en la base de datos' });
  }
};

// Obtén el repositorio del producto
const productoRepository = AppDataSource.getRepository(Producto);

// Función para obtener todos los productos
export const obtenerTodosLosProductos = async (req: Request, res: Response) => {
  try {
    const productos = await productoRepository.find({ relations: ['proveedor'] });
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
      relations: ['proveedor'],
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const resultado = {
      id: producto.id,
      nombreProducto: producto.nombreProducto,
      descripcion: producto.descripcion,
      precio: producto.precio,
      nombreProveedores: producto.proveedor ? producto.proveedor.nombreProveedores : null,
    };

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).json({ message: 'Error al obtener el producto' });
  }

  console.log('ID recibido:', id);
};



export const obtenerProductosPorProveedor = async (req: Request, res: Response) => {
  const { proveedor_id } = req.params;

  const proveedorId = Number(proveedor_id);
  if (isNaN(proveedorId) || proveedorId <= 0) {
    return res.status(400).json({ message: 'ID de proveedor inválido' });
  }

  try {
    // Buscar productos por proveedor
    const productos = await productoRepository.find({
      where: { proveedor: { id: proveedorId } },
      relations: ['proveedor'],
    });

    if (productos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron productos para el proveedor especificado' });
    }

    return res.status(200).json({ productos });
  } catch (error) {
    console.error('Error al obtener productos por proveedor:', error);
    return res.status(500).json({ message: 'Error al obtener productos por proveedor' });
  }
};

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
  const { nombreProducto, cantidad_stock, descripcion, precioCosto, precio, divisa, descuento, rubro_id, sistema_id, disponible, proveedor_id } = req.body;

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
    producto.cantidad_stock = cantidad_stock ?? producto.cantidad_stock;
    producto.descripcion = descripcion ?? producto.descripcion;
    producto.precioCosto = precioCosto ?? producto.precioCosto;
    producto.precio = precio ?? producto.precio;
    producto.divisa = divisa ?? producto.divisa;
    producto.descuento = descuento ?? producto.descuento;
    producto.rubro_id = rubro_id ?? producto.rubro_id;
    producto.sistema_id = sistema_id ?? producto.sistema_id;
    producto.disponible = disponible ?? producto.disponible;
    producto.proveedor = proveedor_id ?? producto.proveedor;

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
      producto.precio = Precio;

      // Guardar los cambios en la base de datos
      await productoRepository.save(producto);
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
    cantidad_stock,
    descripcion,
    precioCosto,
    precio,
    divisa,
    descuento,
    rubro_id,
    sistema_id,
    disponible,
    proveedor_id,
  } = req.body;

  try {
    // Crear una instancia de producto
    const nuevoProducto = new Producto();
    nuevoProducto.id = id;
    nuevoProducto.nombreProducto = nombreProducto;
    nuevoProducto.cantidad_stock = cantidad_stock;
    nuevoProducto.descripcion = descripcion;
    nuevoProducto.precioCosto = precioCosto;
    nuevoProducto.precio = precio;
    nuevoProducto.divisa = divisa;
    nuevoProducto.descuento = descuento;
    nuevoProducto.rubro_id = rubro_id;
    nuevoProducto.sistema_id = sistema_id;
    nuevoProducto.disponible = disponible;
    nuevoProducto.proveedor = proveedor_id;

    // Guardar el nuevo producto en la base de datos
    await AppDataSource.getRepository(Producto).save(nuevoProducto);

    return res.status(201).json({ message: 'Producto creado exitosamente', producto: nuevoProducto });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return res.status(500).json({ message: 'Error al crear el producto' });
  }
};