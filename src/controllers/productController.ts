import { Request, Response } from 'express';
import { Productos, TipoProducto, normalizarTipoProducto } from '../entities/Productos';
import { AppDataSource } from '../config/database'; // Configura tu datasource de TypeORM

function esTipoProductoValido(valor: unknown): boolean {
  if (typeof valor !== 'string' || !valor.trim()) return false;
  const n = valor.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return n === 'insumo' || n === 'venta_publico' || n === 'venta_al_publico';
}

function parseTipoProducto(valor: unknown, fallback: TipoProducto = TipoProducto.VENTA_PUBLICO): TipoProducto {
  if (valor == null || valor === '') return fallback;
  return normalizarTipoProducto(valor);
}

function serializarProducto(producto: Productos | Record<string, unknown>) {
  const row = producto as Productos & Record<string, unknown>;
  return {
    id: Number(row.id),
    nombreProducto: String(row.nombreProducto ?? ''),
    precioPublico: Number(row.precioPublico) || 0,
    precioRevendedor: Number(row.precioRevendedor) || 0,
    cantidadStock: Number(row.cantidadStock) || 0,
    descripcion: String(row.descripcion ?? ''),
    tipoProducto: parseTipoProducto(row.tipoProducto),
  };
}

async function listarProductosDesdeDb(): Promise<Array<Productos | Record<string, unknown>>> {
  try {
    const rows = await AppDataSource.query(
      'SELECT id, nombreProducto, precioPublico, precioRevendedor, cantidadStock, descripcion, tipoProducto FROM productos'
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn('[productos] Listado con tipoProducto falló, reintentando sin esa columna:', error);
    try {
      const rows = await AppDataSource.query(
        'SELECT id, nombreProducto, precioPublico, precioRevendedor, cantidadStock, descripcion FROM productos'
      );
      return Array.isArray(rows) ? rows : [];
    } catch (errorSinTipo) {
      console.error('[productos] No se pudieron leer productos:', errorSinTipo);
      return [];
    }
  }
}

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
      nuevoProducto.tipoProducto = parseTipoProducto(producto.tipoProducto ?? producto.TipoProducto);

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
    const tipoQuery = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
    const productos = await listarProductosDesdeDb();
    const lista = productos.map((producto) => serializarProducto(producto));
    const filtrados =
      tipoQuery && esTipoProductoValido(tipoQuery)
        ? lista.filter((producto) => producto.tipoProducto === parseTipoProducto(tipoQuery))
        : lista;

    res.json(filtrados);
  } catch (error) {
    console.error('Error al obtener todos los productos:', error);
    res.json([]);
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

    const resultado = serializarProducto(producto);


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
    const ultimoProducto = await productoRepository
      .createQueryBuilder('producto')
      .orderBy('producto.id', 'DESC')
      .getOne();

    if (!ultimoProducto) {
      return res.json({ ultimoId: 0 });
    }

    return res.json({ ultimoId: ultimoProducto.id });
  } catch (error) {
    console.error('Error al obtener el último ID de producto:', error);
    return res.status(500).json({ message: 'Error al obtener el último ID de producto' });
  }
};



// Función para actualizar un producto existente
export const actualizarProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombreProducto, cantidadStock, precioPublico, precioRevendedor, descripcion, tipoProducto } = req.body;

  const productId = Number(id);
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ message: 'ID de producto inválido' });
  }

  if (tipoProducto !== undefined && !esTipoProductoValido(tipoProducto)) {
    return res.status(400).json({ message: 'Tipo de producto inválido' });
  }

  try {
    const producto = await productoRepository.findOne({ where: { id: productId } });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar solo los campos que vienen en el request
    if (nombreProducto !== undefined) producto.nombreProducto = nombreProducto;
    if (cantidadStock !== undefined) producto.cantidadStock = cantidadStock;
    if (precioPublico !== undefined) producto.precioPublico = precioPublico;
    if (precioRevendedor !== undefined) producto.precioRevendedor = precioRevendedor;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (tipoProducto !== undefined) producto.tipoProducto = parseTipoProducto(tipoProducto, producto.tipoProducto);

    await productoRepository.save(producto);

    return res.status(200).json({ 
      message: 'Producto actualizado correctamente', 
      producto 
    });
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
    nombreProducto,
    precioPublico,
    precioRevendedor,
    cantidadStock,
    descripcion,
    tipoProducto,
  } = req.body;

  console.log('[crearProducto] Payload recibido:', req.body);

  if (!nombreProducto || String(nombreProducto).trim() === '') {
    return res.status(400).json({ message: 'El nombre del producto es obligatorio' });
  }

  if (tipoProducto !== undefined && !esTipoProductoValido(tipoProducto)) {
    return res.status(400).json({ message: 'Tipo de producto inválido' });
  }

  const precioPublicoNumero = Number(precioPublico);
  const precioRevendedorNumero = Number(precioRevendedor);
  const cantidadStockNumero = Number(cantidadStock ?? 0);

  if (Number.isNaN(precioPublicoNumero) || precioPublicoNumero < 0) {
    return res.status(400).json({ message: 'El precio público debe ser un número válido' });
  }

  if (Number.isNaN(precioRevendedorNumero) || precioRevendedorNumero < 0) {
    return res.status(400).json({ message: 'El precio revendedor debe ser un número válido' });
  }

  if (Number.isNaN(cantidadStockNumero) || cantidadStockNumero < 0) {
    return res.status(400).json({ message: 'La cantidad de stock debe ser un número válido' });
  }

  try {
    const nuevoProducto = productoRepository.create({
      nombreProducto: String(nombreProducto).trim(),
      precioPublico: precioPublicoNumero,
      precioRevendedor: precioRevendedorNumero,
      cantidadStock: cantidadStockNumero,
      descripcion: descripcion != null ? String(descripcion).trim() : '',
      tipoProducto: parseTipoProducto(tipoProducto),
    });

    const productoGuardado = await productoRepository.save(nuevoProducto);

    return res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: productoGuardado,
    });
  } catch (error: any) {
    console.error('Error al crear el producto:', error);

    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un producto con ese ID' });
    }

    return res.status(500).json({
      message: 'Error al crear el producto',
      error: error?.message || 'Error desconocido',
    });
  }
};
