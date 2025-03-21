import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Descarga } from '../entities/Descarga';
import { Repartidor } from '../entities/Repartidor';
import { Carga } from '../entities/Carga';
import { Equal, Between } from 'typeorm';

interface VentasPorProducto {
  [key: number]: {
    producto_id: number;
    nombre_producto: string;
    total_vendidos: number;
    total_envases_recuperados: number;
    deficit_total_envases: number;
    ventas_por_mes: {
      [key: string]: {
        vendidos: number;
        envases_recuperados: number;
        deficit_envases: number;
      }
    }
  }
}

export const descargaController = {
  // Crear una nueva descarga
  crear: async (req: Request, res: Response) => {
    try {
      const {
        repartidor_id,
        carga_id,
        productos_devueltos,
        envases_recuperados,
        observaciones
      } = req.body;

      const descargaRepository = AppDataSource.getRepository(Descarga);
      const cargaRepository = AppDataSource.getRepository(Carga);
      const repartidorRepo = AppDataSource.getRepository(Repartidor);

      // Verificar si existe el repartidor
      const repartidor = await repartidorRepo.findOne({ where: { id: repartidor_id } });
      if (!repartidor) {
        return res.status(404).json({ message: 'Repartidor no encontrado' });
      }

      // Obtener la carga específica
      const carga = await cargaRepository.findOne({
        where: { id: carga_id },
        relations: ['items']
      });

      if (!carga) {
        return res.status(404).json({ message: 'Carga no encontrada' });
      }

      if (carga.estado === 'completada') {
        return res.status(400).json({ message: 'Esta carga ya ha sido completada' });
      }

      // Calcular productos vendidos
      const productos_vendidos = carga.items.reduce((total, item) => {
        const devuelto = productos_devueltos.find((p: { producto_id: number; }) => p.producto_id === item.producto_id);
        return total + (item.cantidad - (devuelto ? devuelto.cantidad : 0));
      }, 0);

      // Calcular total de envases recuperados
      const total_envases_recuperados = Array.isArray(envases_recuperados) 
        ? envases_recuperados.reduce((total, e: { cantidad: number }) => total + e.cantidad, 0) 
        : 0;
      
      // Calcular déficit de envases
      const deficit_envases = productos_vendidos - total_envases_recuperados;

      // Preparar array de envases para la entidad Descarga
      const envases_array = Array.isArray(envases_recuperados) && envases_recuperados.length > 0
        ? envases_recuperados.map((e: { producto_id: number; cantidad: number; }) => ({
            producto_id: e.producto_id,
            envases_recuperados: e.cantidad,
            deficit_envases: productos_devueltos.find((p: { producto_id: number; }) => p.producto_id === e.producto_id)?.cantidad || 0
          }))
        : [];

      const nuevaDescarga = descargaRepository.create({
        repartidor,
        carga,
        productos_devueltos,
        productos_vendidos,
        envases: envases_array,
        observaciones
      });

      await descargaRepository.save(nuevaDescarga);

      // Actualizar el estado de la carga a completada
      carga.estado = 'completada';
      await cargaRepository.save(carga);

      res.status(201).json({
        message: 'Descarga registrada exitosamente',
        data: nuevaDescarga
      });
    } catch (error) {
      console.error('Error al crear descarga:', error);
      res.status(500).json({ message: 'Error al registrar la descarga' });
    }
  },

  // Obtener todas las descargas
  obtenerTodas: async (_req: Request, res: Response) => {
    try {
      const descargaRepository = AppDataSource.getRepository(Descarga);
      const descargas = await descargaRepository.find({
        relations: ['repartidor', 'carga']
      });

      res.json(descargas);
    } catch (error) {
      console.error('Error al obtener descargas:', error);
      res.status(500).json({ message: 'Error al obtener las descargas' });
    }
  },

  // Obtener descargas por repartidor
  obtenerPorRepartidor: async (req: Request, res: Response) => {
    try {
      const { repartidor_id } = req.params;
      const descargaRepository = AppDataSource.getRepository(Descarga);
      
      const descargas = await descargaRepository.find({
        where: {
          repartidor: Equal(parseInt(repartidor_id))
        },
        relations: [
          'repartidor', 
          'carga', 
          'carga.items',
          'carga.items.producto'  // Agregamos esta relación para acceder al precio
        ]
      });

      // Transformamos la respuesta para incluir el precio total
      const descargasConPrecio = descargas.map(descarga => {
        // Calculamos el precio total de la venta
        const precioTotal = descarga.carga.items.reduce((total, item) => {
          const productosDevueltos = Array.isArray(descarga.productos_devueltos) 
            ? descarga.productos_devueltos 
            : [];
          
          const devuelto = productosDevueltos.find(
            (p: { producto_id: number; cantidad: number }) => 
            p.producto_id === item.producto_id
          );
          
          const cantidadDevuelta = devuelto ? devuelto.cantidad : 0;
          const vendidos = item.cantidad - cantidadDevuelta;
          
          return total + (vendidos * item.producto.precioPublico);
        }, 0);

        return {
          ...descarga,
          precio_total_venta: precioTotal,
          estado_cuenta: descarga.estado_cuenta || 'pendiente'
        };
      });

      res.json(descargasConPrecio);
    } catch (error) {
      console.error('Error al obtener descargas del repartidor:', error);
      res.status(500).json({ message: 'Error al obtener las descargas del repartidor' });
    }
  },

  // Obtener resumen de carga y descarga
  obtenerResumen: async (req: Request, res: Response) => {
    try {
      const { descarga_id } = req.params;
      const descargaRepository = AppDataSource.getRepository(Descarga);
      
      const descarga = await descargaRepository.findOne({
        where: { id: parseInt(descarga_id) },
        relations: ['repartidor', 'carga', 'carga.items', 'envases']
      });

      if (!descarga) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
      }

      const resumen = {
        fecha_carga: descarga.carga.fecha_carga,
        fecha_descarga: descarga.fecha_descarga,
        repartidor: descarga.repartidor.nombre,
        productos_cargados: descarga.carga.items?.reduce((total, item) => total + item.cantidad, 0) || 0,
        productos_devueltos: descarga.productos_devueltos,
        productos_vendidos: descarga.productos_vendidos,
        envases_recuperados: descarga.envases?.reduce((total, envase) => total + envase.envases_recuperados, 0) || 0,
        deficit_envases: descarga.envases?.reduce((total, envase) => total + envase.deficit_envases, 0) || 0,
        observaciones: descarga.observaciones
      };

      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      res.status(500).json({ message: 'Error al obtener el resumen' });
    }
  },

  // Obtener resumen de ventas por producto y período
  obtenerResumenVentas: async (req: Request, res: Response) => {
    try {
      const { repartidor_id, fecha_inicio, fecha_fin } = req.query;
      const descargaRepository = AppDataSource.getRepository(Descarga);
      
      const descargas = await descargaRepository.find({
        where: {
          repartidor: Equal(parseInt(repartidor_id as string)),
          fecha_descarga: fecha_inicio && fecha_fin ? Between(new Date(fecha_inicio as string), new Date(fecha_fin as string)) : undefined
        },
        relations: ['repartidor', 'carga', 'carga.items', 'carga.items.producto', 'envases']
      });

      // Agrupar ventas por producto
      const ventasPorProducto = descargas.reduce<VentasPorProducto>((acc, descarga) => {
        descarga.carga.items.forEach(item => {
          const productoId = item.producto_id;
          if (!acc[productoId]) {
            acc[productoId] = {
              producto_id: productoId,
              nombre_producto: item.producto?.nombreProducto ?? `Producto ${productoId}`,
              total_vendidos: 0,
              total_envases_recuperados: 0,
              deficit_total_envases: 0,
              ventas_por_mes: {}
            };
          }

          const mes = descarga.fecha_descarga.toISOString().slice(0, 7); // formato YYYY-MM
          if (!acc[productoId].ventas_por_mes[mes]) {
            acc[productoId].ventas_por_mes[mes] = {
              vendidos: 0,
              envases_recuperados: 0,
              deficit_envases: 0
            };
          }
          // Encontrar los productos devueltos correspondientes
          const devueltos = Array.isArray(descarga.productos_devueltos) 
            ? descarga.productos_devueltos.find((p: { producto_id: number; cantidad: number }) => p.producto_id === productoId)?.cantidad || 0
            : 0;
          const vendidos = item.cantidad - devueltos;

          // Encontrar los envases recuperados correspondientes
          const envaseInfo = descarga.envases.find((e: { producto_id: number }) => e.producto_id === productoId);
          const envases_recuperados = envaseInfo?.envases_recuperados || 0;
          const deficit = vendidos - envases_recuperados;

          acc[productoId].total_vendidos += vendidos;
          acc[productoId].total_envases_recuperados += envases_recuperados;
          acc[productoId].deficit_total_envases += deficit;

          acc[productoId].ventas_por_mes[mes].vendidos += vendidos;
          acc[productoId].ventas_por_mes[mes].envases_recuperados += envases_recuperados;
          acc[productoId].ventas_por_mes[mes].deficit_envases += deficit;
        });
        return acc;
      }, {});

      res.json(Object.values(ventasPorProducto));
    } catch (error) {
      console.error('Error al obtener resumen de ventas:', error);
      res.status(500).json({ message: 'Error al obtener el resumen de ventas' });
    }
  },

  // Obtener detalle de envases por descarga
  obtenerDetalleEnvases: async (req: Request, res: Response) => {
    try {
      const { descarga_id } = req.params;
      const descargaRepository = AppDataSource.getRepository(Descarga);
      
      const descarga = await descargaRepository.findOne({
        where: { id: parseInt(descarga_id) },
        relations: [
          'repartidor',
          'envases',
          'envases.producto'
        ]
      });

      if (!descarga) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
      }

      // Simplificamos la respuesta para enfocarnos en los envases faltantes
      const resumen = {
        descarga_id: descarga.id,
        repartidor: {
          id: descarga.repartidor.id,
          nombre: descarga.repartidor.nombre
        },
        envases_faltantes: descarga.envases.map(envase => ({
          producto_id: envase.producto_id,
          nombre_producto: envase.producto.nombreProducto,
          deficit: envase.deficit_envases,
          envases_recuperados: envase.envases_recuperados
        })),
        total_deficit: descarga.envases.reduce((total, envase) => total + envase.deficit_envases, 0)
      };

      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener detalle de envases:', error);
      res.status(500).json({ 
        message: 'Error al obtener el detalle de envases',
        error: (error as Error).message
      });
    }
  },

  cerrarCuenta: async (req: Request, res: Response) => {
    try {
      const { descarga_id } = req.params;
      const { porcentaje_repartidor, porcentaje_empresa } = req.body;

      // Validar que los porcentajes sean números enteros
      if (!Number.isInteger(porcentaje_repartidor) || !Number.isInteger(porcentaje_empresa)) {
        return res.status(400).json({ 
          message: 'Los porcentajes deben ser números enteros',
          ejemplo: { porcentaje_repartidor: 20, porcentaje_empresa: 80 }
        });
      }

      // Validar que los porcentajes sumen 100
      if (porcentaje_repartidor + porcentaje_empresa !== 100) {
        return res.status(400).json({ 
          message: 'La suma de los porcentajes debe ser 100',
          porcentajes_recibidos: {
            porcentaje_repartidor,
            porcentaje_empresa,
            suma: porcentaje_repartidor + porcentaje_empresa
          }
        });
      }

      const descargaRepository = AppDataSource.getRepository(Descarga);
      
      const descarga = await descargaRepository.findOne({
        where: { id: parseInt(descarga_id) },
        relations: [
          'repartidor',
          'carga',
          'carga.items',
          'carga.items.producto'
        ]
      });

      if (!descarga) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
      }

      if (descarga.estado_cuenta === 'finalizado') {
        return res.status(400).json({ message: 'Esta cuenta ya ha sido cerrada' });
      }

      // Calcular montos usando el precio público del producto
      const monto_total = descarga.carga.items.reduce((total, item) => {
        // Buscamos en el array JSON de productos_devueltos
        const productosDevueltos = Array.isArray(descarga.productos_devueltos) 
          ? descarga.productos_devueltos 
          : [];
        
        const devuelto = productosDevueltos.find(
          (p: { producto_id: number; cantidad: number }) => 
          p.producto_id === item.producto_id
        );
        
        const cantidadDevuelta = devuelto ? devuelto.cantidad : 0;
        const vendidos = item.cantidad - cantidadDevuelta;
        
        return total + (vendidos * item.producto.precioPublico);
      }, 0);

      const ganancia_repartidor = (monto_total * porcentaje_repartidor) / 100;
      const ganancia_empresa = (monto_total * porcentaje_empresa) / 100;

      // Actualizar descarga
      descarga.estado_cuenta = 'finalizado';
      descarga.monto_total = monto_total;
      descarga.ganancia_repartidor = ganancia_repartidor;
      descarga.ganancia_empresa = ganancia_empresa;
      descarga.porcentaje_repartidor = porcentaje_repartidor;
      descarga.porcentaje_empresa = porcentaje_empresa;

      await descargaRepository.save(descarga);

      res.json({
        message: 'Cuenta cerrada exitosamente',
        resumen: {
          descarga_id: descarga.id,
          repartidor: descarga.repartidor.nombre,
          monto_total,
          porcentajes: {
            repartidor: porcentaje_repartidor,
            empresa: porcentaje_empresa
          },
          ganancias: {
            repartidor: ganancia_repartidor,
            empresa: ganancia_empresa
          },
          fecha_cierre: new Date()
        }
      });
    } catch (error) {
      console.error('Error al cerrar cuenta:', error);
      res.status(500).json({ 
        message: 'Error al cerrar la cuenta',
        error: (error as Error).message
      });
    }
  },

  obtenerEstadoCuenta: async (req: Request, res: Response) => {
    try {
      const { descarga_id } = req.params;
      const descargaRepository = AppDataSource.getRepository(Descarga);
      
      const descarga = await descargaRepository.findOne({
        where: { id: parseInt(descarga_id) },
        relations: ['repartidor', 'carga', 'carga.items', 'carga.items.producto']
      });

      if (!descarga) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
      }

      const resumen = {
        descarga_id: descarga.id,
        repartidor: {
          id: descarga.repartidor.id,
          nombre: descarga.repartidor.nombre
        },
        estado_cuenta: descarga.estado_cuenta || 'pendiente',
        fecha_descarga: descarga.fecha_descarga,
        monto_total: descarga.monto_total || 0,
        ganancia_repartidor: descarga.ganancia_repartidor || 0,
        ganancia_empresa: descarga.ganancia_empresa || 0
      };

      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener estado de cuenta:', error);
      res.status(500).json({ message: 'Error al obtener el estado de cuenta' });
    }
  }
}; 