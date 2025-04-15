import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { VentaCerrada } from '../entities/VentaCerrada';
import { Repartidor } from '../entities/Repartidor';
import { Descarga } from '../entities/Descarga';
import { In } from 'typeorm';

const ventaCerradaRepository = AppDataSource.getRepository(VentaCerrada);
const repartidorRepository = AppDataSource.getRepository(Repartidor);
const descargaRepository = AppDataSource.getRepository(Descarga);

export const createVentaCerrada = async (req: Request, res: Response) => {
  try {
    const { 
      proceso_id, 
      comision_porcentaje, 
      monto_efectivo, 
      monto_transferencia, 
      balance_fiado = 0,
      repartidor_id,
      observaciones 
    } = req.body;

    // Validar datos requeridos
    if (!proceso_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'El ID del proceso es requerido' 
      });
    }

    // Verificar que la descarga existe
    const descarga = await descargaRepository.findOne({
      where: { id: proceso_id },
      relations: ['carga', 'carga.items', 'carga.items.producto']
    });

    if (!descarga) {
      return res.status(404).json({ 
        success: false, 
        message: 'La descarga no existe' 
      });
    }

    // Calcular el total real de la venta basado en los productos vendidos
    const total_venta = descarga.carga.items.reduce((total, item) => {
      const devueltos = Array.isArray(descarga.productos_devueltos) 
        ? descarga.productos_devueltos.find(
            (p: { producto_id: number; cantidad: number }) => 
            p.producto_id === item.producto_id
          )?.cantidad || 0
        : 0;
      
      const vendidos = item.cantidad - devueltos;
      return total + (vendidos * item.producto.precioPublico);
    }, 0);

    // Calcular el balance_fiado como la diferencia entre los pagos recibidos y el total
    const pagos_recibidos = (monto_efectivo || 0) + (monto_transferencia || 0);
    const balance_fiado_calculado = pagos_recibidos - total_venta;

    // Calcular ganancias
    const ganancia_repartidor = total_venta * ((comision_porcentaje || 0) / 100);
    const ganancia_fabrica = total_venta - ganancia_repartidor;

    // Iniciar transacción
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Crear la venta cerrada
      const ventaCerrada = ventaCerradaRepository.create({
        proceso_id,
        total_venta,
        comision_porcentaje: comision_porcentaje || 0,
        ganancia_repartidor,
        ganancia_fabrica,
        monto_efectivo: monto_efectivo || 0,
        monto_transferencia: monto_transferencia || 0,
        balance_fiado: balance_fiado_calculado,
        repartidor_id,
        observaciones
      });

      // Guardar la venta cerrada
      const ventaCerradaGuardada = await queryRunner.manager.save(ventaCerrada);

      // Actualizar el estado de la descarga
      await queryRunner.manager.update(Descarga, proceso_id, {
        estado_cuenta: 'finalizado'
      });

      // Confirmar la transacción
      await queryRunner.commitTransaction();

      // Obtener la venta cerrada con la relación al repartidor
      const ventaCerradaConRelaciones = await ventaCerradaRepository.findOne({
        where: { id: ventaCerradaGuardada.id },
        relations: ['repartidor']
      });

      // Formatear la respuesta
      const respuesta = {
        success: true,
        venta_cerrada: {
          id: ventaCerradaConRelaciones?.id,
          proceso_id: ventaCerradaConRelaciones?.proceso_id,
          fecha_cierre: ventaCerradaConRelaciones?.fecha_cierre,
          total_venta: ventaCerradaConRelaciones?.total_venta,
          comision_porcentaje: ventaCerradaConRelaciones?.comision_porcentaje,
          ganancia_repartidor: ventaCerradaConRelaciones?.ganancia_repartidor,
          ganancia_fabrica: ventaCerradaConRelaciones?.ganancia_fabrica,
          monto_efectivo: ventaCerradaConRelaciones?.monto_efectivo,
          monto_transferencia: ventaCerradaConRelaciones?.monto_transferencia,
          balance_fiado: ventaCerradaConRelaciones?.balance_fiado,
          repartidor: ventaCerradaConRelaciones?.repartidor ? {
            id: ventaCerradaConRelaciones.repartidor.id,
            nombre: ventaCerradaConRelaciones.repartidor.nombre
          } : null,
          observaciones: ventaCerradaConRelaciones?.observaciones
        }
      };

      res.status(201).json(respuesta);
    } catch (error) {
      // Si hay un error, revertir la transacción
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el queryRunner
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error al crear venta cerrada:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear la venta cerrada',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getVentasCerradas = async (req: Request, res: Response) => {
  try {
    const ventasCerradas = await ventaCerradaRepository.find({
      relations: ['repartidor'],
      order: { fecha_cierre: 'DESC' }
    });

    const ventasFormateadas = ventasCerradas.map(venta => ({
      id: venta.id,
      proceso_id: venta.proceso_id,
      fecha_cierre: venta.fecha_cierre,
      total_venta: venta.total_venta,
      comision_porcentaje: venta.comision_porcentaje,
      ganancia_repartidor: venta.ganancia_repartidor,
      ganancia_fabrica: venta.ganancia_fabrica,
      monto_efectivo: venta.monto_efectivo,
      monto_transferencia: venta.monto_transferencia,
      balance_fiado: venta.balance_fiado,
      estado: venta.estado,
      repartidor: venta.repartidor ? {
        id: venta.repartidor.id,
        nombre: venta.repartidor.nombre
      } : null,
      observaciones: venta.observaciones,
      created_at: venta.created_at
    }));

    res.json({
      success: true,
      ventas_cerradas: ventasFormateadas
    });
  } catch (error) {
    console.error('Error al obtener ventas cerradas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las ventas cerradas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getVentaCerradaById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const ventaCerrada = await ventaCerradaRepository.findOne({
      where: { id },
      relations: ['repartidor']
    });

    if (!ventaCerrada) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venta cerrada no encontrada' 
      });
    }

    const ventaFormateada = {
      id: ventaCerrada.id,
      proceso_id: ventaCerrada.proceso_id,
      fecha_cierre: ventaCerrada.fecha_cierre,
      total_venta: ventaCerrada.total_venta,
      comision_porcentaje: ventaCerrada.comision_porcentaje,
      ganancia_repartidor: ventaCerrada.ganancia_repartidor,
      ganancia_fabrica: ventaCerrada.ganancia_fabrica,
      monto_efectivo: ventaCerrada.monto_efectivo,
      monto_transferencia: ventaCerrada.monto_transferencia,
      balance_fiado: ventaCerrada.balance_fiado,
      repartidor: ventaCerrada.repartidor ? {
        id: ventaCerrada.repartidor.id,
        nombre: ventaCerrada.repartidor.nombre
      } : null,
      observaciones: ventaCerrada.observaciones,
      created_at: ventaCerrada.created_at
    };

    res.json({
      success: true,
      venta_cerrada: ventaFormateada
    });
  } catch (error) {
    console.error('Error al obtener venta cerrada:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener la venta cerrada',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getVentasCerradasByRepartidor = async (req: Request, res: Response) => {
  try {
    const repartidorId = parseInt(req.params.repartidorId);
    
    if (isNaN(repartidorId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de repartidor inválido' 
      });
    }

    // Verificar que el repartidor existe
    const repartidor = await repartidorRepository.findOne({
      where: { id: repartidorId.toString() }
    });

    if (!repartidor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Repartidor no encontrado' 
      });
    }

    // Obtener las ventas cerradas del repartidor
    const ventasCerradas = await ventaCerradaRepository.find({
      where: { repartidor_id: repartidorId },
      relations: ['repartidor'],
      order: { fecha_cierre: 'DESC' }
    });

    const ventasFormateadas = ventasCerradas.map(venta => ({
      id: venta.id,
      proceso_id: venta.proceso_id,
      fecha_cierre: venta.fecha_cierre,
      total_venta: venta.total_venta,
      comision_porcentaje: venta.comision_porcentaje,
      ganancia_repartidor: venta.ganancia_repartidor,
      ganancia_fabrica: venta.ganancia_fabrica,
      monto_efectivo: venta.monto_efectivo,
      monto_transferencia: venta.monto_transferencia,
      balance_fiado: venta.balance_fiado,
      estado: venta.estado,
      repartidor: venta.repartidor ? {
        id: venta.repartidor.id,
        nombre: venta.repartidor.nombre
      } : null,
      observaciones: venta.observaciones,
      created_at: venta.created_at
    }));

    // Calcular totales
    const totalVentas = ventasCerradas.reduce((sum, venta) => sum + Number(venta.total_venta), 0);
    const totalGananciaRepartidor = ventasCerradas.reduce((sum, venta) => sum + Number(venta.ganancia_repartidor), 0);
    const totalGananciaFabrica = ventasCerradas.reduce((sum, venta) => sum + Number(venta.ganancia_fabrica), 0);
    const totalEfectivo = ventasCerradas.reduce((sum, venta) => sum + Number(venta.monto_efectivo), 0);
    const totalTransferencia = ventasCerradas.reduce((sum, venta) => sum + Number(venta.monto_transferencia), 0);
    const totalFiado = ventasCerradas.reduce((sum, venta) => sum + Number(venta.balance_fiado), 0);

    res.json({
      success: true,
      repartidor: {
        id: repartidor.id,
        nombre: repartidor.nombre
      },
      ventas_cerradas: ventasFormateadas,
      totales: {
        total_ventas: totalVentas,
        total_ganancia_repartidor: totalGananciaRepartidor,
        total_ganancia_fabrica: totalGananciaFabrica,
        total_efectivo: totalEfectivo,
        total_transferencia: totalTransferencia,
        total_fiado: totalFiado
      }
    });
  } catch (error) {
    console.error('Error al obtener ventas cerradas por repartidor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las ventas cerradas del repartidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const actualizarVentaCerrada = async (req: Request, res: Response) => {
  try {
    const { ids, comision_porcentaje, observaciones } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de ventas a actualizar'
      });
    }

    if (!comision_porcentaje) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje de comisión es requerido'
      });
    }

    // Buscar todas las ventas cerradas
    const ventasCerradas = await ventaCerradaRepository.find({
      where: { id: In(ids) }
    });

    if (ventasCerradas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron ventas para actualizar'
      });
    }

    // Verificar que ninguna venta ya esté finalizada
    const ventasFinalizadas = ventasCerradas.filter(v => v.estado === 'Finalizado');
    if (ventasFinalizadas.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Algunas ventas ya han sido finalizadas',
        ventas_finalizadas: ventasFinalizadas.map(v => v.id)
      });
    }

    // Actualizar todas las ventas en una transacción
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const venta of ventasCerradas) {
        const ganancia_repartidor = venta.total_venta * (comision_porcentaje / 100);
        const ganancia_fabrica = venta.total_venta - ganancia_repartidor;

        await queryRunner.manager.update(VentaCerrada, venta.id, {
          estado: 'Finalizado',
          comision_porcentaje,
          ganancia_repartidor,
          ganancia_fabrica,
          observaciones: observaciones || venta.observaciones
        });
      }

      await queryRunner.commitTransaction();

      // Obtener las ventas actualizadas
      const ventasActualizadas = await ventaCerradaRepository.find({
        where: { id: In(ids) },
        relations: ['repartidor']
      });

      res.json({
        success: true,
        message: 'Ventas cerradas actualizadas correctamente',
        ventas_cerradas: ventasActualizadas.map(venta => ({
          id: venta.id,
          estado: venta.estado,
          total_venta: venta.total_venta,
          comision_porcentaje: venta.comision_porcentaje,
          ganancia_repartidor: venta.ganancia_repartidor,
          ganancia_fabrica: venta.ganancia_fabrica,
          repartidor: {
            id: venta.repartidor.id,
            nombre: venta.repartidor.nombre
          },
          observaciones: venta.observaciones
        }))
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    console.error('Error al actualizar ventas cerradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar las ventas cerradas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}; 