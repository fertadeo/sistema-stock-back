import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { VentaCerrada } from '../entities/VentaCerrada';
import { Repartidor } from '../entities/Repartidor';
import { Descarga } from '../entities/Descarga';
import { In, IsNull } from 'typeorm';
import { MovimientoService } from '../services/movimientoService';

const whereActivas = { deleted_at: IsNull() };

const ventaCerradaRepository = AppDataSource.getRepository(VentaCerrada);
const repartidorRepository = AppDataSource.getRepository(Repartidor);
const descargaRepository = AppDataSource.getRepository(Descarga);
const movimientoService = new MovimientoService();

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

    const ventaExistente = await ventaCerradaRepository.findOne({
      where: { proceso_id, ...whereActivas }
    });
    if (ventaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Este proceso ya tiene una venta cerrada activa'
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

      // Registrar el movimiento
      await movimientoService.registrarVentaRepartidor(
        total_venta,
        descarga.carga.items.map(item => item.producto.nombreProducto),
        {
          venta_cerrada_id: ventaCerradaGuardada.id,
          repartidor_id: repartidor_id,
          monto_efectivo: monto_efectivo || 0,
          monto_transferencia: monto_transferencia || 0,
          balance_fiado: balance_fiado_calculado,
          comision_porcentaje: comision_porcentaje || 0,
          ganancia_repartidor,
          ganancia_fabrica
        }
      );

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
    // Incluye anuladas (soft delete) para poder verlas y rehabilitarlas en UI
    const ventasCerradas = await ventaCerradaRepository.find({
      relations: ['repartidor'],
      order: { fecha_cierre: 'DESC' }
    });

    // Obtener las descargas relacionadas con sus items y productos
    const descargas = await descargaRepository.find({
      where: { id: In(ventasCerradas.map(v => v.proceso_id)) },
      relations: ['carga', 'carga.items', 'carga.items.producto']
    });

    const ventasFormateadas = ventasCerradas.map(venta => {
      const descarga = descargas.find(d => d.id === venta.proceso_id);
      
      // Calcular el detalle de productos
      const productos_detalle = descarga?.carga?.items.map(item => {
        const devueltos = Array.isArray(descarga.productos_devueltos) 
          ? descarga.productos_devueltos.find(
              (p: { producto_id: number; cantidad: number }) => 
              p.producto_id === item.producto_id
            )?.cantidad || 0
          : 0;
        
        const cantidad_vendida = item.cantidad - devueltos;
        let precio_unitario = item.producto.precioPublico;
        if (Array.isArray(descarga.precios_unitarios)) {
          const precioEditado = descarga.precios_unitarios.find(
            (p: { producto_id: number; precio_unitario: number }) => p.producto_id === item.producto_id
          );
          if (precioEditado) {
            precio_unitario = precioEditado.precio_unitario;
          }
        }
        const subtotal = cantidad_vendida * precio_unitario;

        return {
          producto_id: item.producto_id,
          nombre: item.producto.nombreProducto,
          cantidad_vendida,
          precio_unitario,
          subtotal
        };
      }) || [];

      // Sumar los subtotales para obtener el total de venta actualizado
      const total_venta_actualizado = productos_detalle.reduce((sum, prod) => sum + prod.subtotal, 0);

      // Recalcular ganancias y balance fiado
      const ganancia_repartidor = total_venta_actualizado * ((venta.comision_porcentaje || 0) / 100);
      const ganancia_fabrica = total_venta_actualizado - ganancia_repartidor;
      const pagos_recibidos = Number(venta.monto_efectivo || 0) + Number(venta.monto_transferencia || 0);
      const balance_fiado = pagos_recibidos - total_venta_actualizado;

      return {
        id: venta.id,
        proceso_id: venta.proceso_id,
        fecha_cierre: venta.fecha_cierre,
        fecha_carga: descarga?.carga?.fecha_carga,
        total_venta: total_venta_actualizado,
        comision_porcentaje: venta.comision_porcentaje,
        ganancia_repartidor,
        ganancia_fabrica,
        monto_efectivo: venta.monto_efectivo,
        monto_transferencia: venta.monto_transferencia,
        balance_fiado,
        estado: venta.estado,
        deleted_at: venta.deleted_at ?? null,
        repartidor: venta.repartidor ? {
          id: venta.repartidor.id,
          nombre: venta.repartidor.nombre
        } : null,
        observaciones: venta.observaciones,
        created_at: venta.created_at,
        grupo_cierre: venta.grupo_cierre,
        productos_detalle
      };
    });

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
      where: { id, ...whereActivas },
      relations: ['repartidor']
    });

    if (!ventaCerrada) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venta cerrada no encontrada' 
      });
    }

    // Obtener la descarga relacionada con sus items y productos
    const descarga = await descargaRepository.findOne({
      where: { id: ventaCerrada.proceso_id },
      relations: ['carga', 'carga.items', 'carga.items.producto']
    });

    // Calcular el detalle de productos
    const productos_detalle = descarga?.carga?.items.map(item => {
      const devueltos = Array.isArray(descarga.productos_devueltos) 
        ? descarga.productos_devueltos.find(
            (p: { producto_id: number; cantidad: number }) => 
            p.producto_id === item.producto_id
          )?.cantidad || 0
        : 0;
      
      const cantidad_vendida = item.cantidad - devueltos;
      let precio_unitario = item.producto.precioPublico;
      if (Array.isArray(descarga.precios_unitarios)) {
        const precioEditado = descarga.precios_unitarios.find(
          (p: { producto_id: number; precio_unitario: number }) => p.producto_id === item.producto_id
        );
        if (precioEditado) {
          precio_unitario = precioEditado.precio_unitario;
        }
      }
      const subtotal = cantidad_vendida * precio_unitario;

      return {
        producto_id: item.producto_id,
        nombre: item.producto.nombreProducto,
        cantidad_vendida,
        precio_unitario,
        subtotal
      };
    }) || [];

    // Sumar los subtotales para obtener el total de venta actualizado
    const total_venta_actualizado = productos_detalle.reduce((sum, prod) => sum + prod.subtotal, 0);

    // Recalcular ganancias y balance fiado
    const ganancia_repartidor = total_venta_actualizado * ((ventaCerrada.comision_porcentaje || 0) / 100);
    const ganancia_fabrica = total_venta_actualizado - ganancia_repartidor;
    const pagos_recibidos = Number(ventaCerrada.monto_efectivo || 0) + Number(ventaCerrada.monto_transferencia || 0);
    const balance_fiado = pagos_recibidos - total_venta_actualizado;

    const ventaFormateada = {
      id: ventaCerrada.id,
      proceso_id: ventaCerrada.proceso_id,
      fecha_cierre: ventaCerrada.fecha_cierre,
      fecha_carga: descarga?.carga?.fecha_carga,
      total_venta: total_venta_actualizado,
      comision_porcentaje: ventaCerrada.comision_porcentaje,
      ganancia_repartidor,
      ganancia_fabrica,
      monto_efectivo: ventaCerrada.monto_efectivo,
      monto_transferencia: ventaCerrada.monto_transferencia,
      balance_fiado,
      repartidor: ventaCerrada.repartidor ? {
        id: ventaCerrada.repartidor.id,
        nombre: ventaCerrada.repartidor.nombre
      } : null,
      observaciones: ventaCerrada.observaciones,
      created_at: ventaCerrada.created_at,
      productos_detalle
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
      where: { id: Number(repartidorId) }
    });

    if (!repartidor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Repartidor no encontrado' 
      });
    }

    // Incluye anuladas (soft delete) para poder verlas y rehabilitarlas en UI
    const ventasCerradas = await ventaCerradaRepository.find({
      where: { repartidor_id: repartidorId },
      relations: ['repartidor'],
      order: { fecha_cierre: 'DESC' }
    });

    // Obtener las descargas relacionadas con sus items y productos
    const descargas = await descargaRepository.find({
      where: { id: In(ventasCerradas.map(v => v.proceso_id)) },
      relations: ['carga', 'carga.items', 'carga.items.producto']
    });

    const ventasFormateadas = ventasCerradas.map(venta => {
      const descarga = descargas.find(d => d.id === venta.proceso_id);
      
      // Calcular el detalle de productos
      const productos_detalle = descarga?.carga?.items.map(item => {
        const devueltos = Array.isArray(descarga.productos_devueltos) 
          ? descarga.productos_devueltos.find(
              (p: { producto_id: number; cantidad: number }) => 
              p.producto_id === item.producto_id
            )?.cantidad || 0
          : 0;
        
        const cantidad_vendida = item.cantidad - devueltos;
        let precio_unitario = item.producto.precioPublico;
        if (Array.isArray(descarga.precios_unitarios)) {
          const precioEditado = descarga.precios_unitarios.find(
            (p: { producto_id: number; precio_unitario: number }) => p.producto_id === item.producto_id
          );
          if (precioEditado) {
            precio_unitario = precioEditado.precio_unitario;
          }
        }
        const subtotal = cantidad_vendida * precio_unitario;

        return {
          producto_id: item.producto_id,
          nombre: item.producto.nombreProducto,
          cantidad_vendida,
          precio_unitario,
          subtotal
        };
      }) || [];

      // Sumar los subtotales para obtener el total de venta actualizado
      const total_venta_actualizado = productos_detalle.reduce((sum, prod) => sum + prod.subtotal, 0);

      // Recalcular ganancias y balance fiado
      const ganancia_repartidor = total_venta_actualizado * ((venta.comision_porcentaje || 0) / 100);
      const ganancia_fabrica = total_venta_actualizado - ganancia_repartidor;
      const pagos_recibidos = Number(venta.monto_efectivo || 0) + Number(venta.monto_transferencia || 0);
      const balance_fiado = pagos_recibidos - total_venta_actualizado;

      return {
        id: venta.id,
        proceso_id: venta.proceso_id,
        fecha_cierre: venta.fecha_cierre,
        fecha_carga: descarga?.carga?.fecha_carga,
        total_venta: total_venta_actualizado,
        comision_porcentaje: venta.comision_porcentaje,
        ganancia_repartidor,
        ganancia_fabrica,
        monto_efectivo: venta.monto_efectivo,
        monto_transferencia: venta.monto_transferencia,
        balance_fiado,
        estado: venta.estado,
        deleted_at: venta.deleted_at ?? null,
        grupo_cierre: venta.grupo_cierre,
        repartidor: venta.repartidor ? {
          id: venta.repartidor.id,
          nombre: venta.repartidor.nombre
        } : null,
        observaciones: venta.observaciones,
        created_at: venta.created_at,
        productos_detalle
      };
    });

    // Totales solo con ventas no anuladas
    const ventasActivas = ventasCerradas.filter(v => !v.deleted_at);
    const totalVentas = ventasActivas.reduce((sum, venta) => sum + Number(venta.total_venta), 0);
    const totalGananciaRepartidor = ventasActivas.reduce((sum, venta) => sum + Number(venta.ganancia_repartidor), 0);
    const totalGananciaFabrica = ventasActivas.reduce((sum, venta) => sum + Number(venta.ganancia_fabrica), 0);
    const totalEfectivo = ventasActivas.reduce((sum, venta) => sum + Number(venta.monto_efectivo), 0);
    const totalTransferencia = ventasActivas.reduce((sum, venta) => sum + Number(venta.monto_transferencia), 0);
    const totalFiado = ventasActivas.reduce((sum, venta) => sum + Number(venta.balance_fiado), 0);

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
    const { ids, comision_porcentaje, observaciones, grupo_cierre } = req.body;

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

    if (!grupo_cierre) {
      return res.status(400).json({
        success: false,
        message: 'El grupo de cierre es requerido'
      });
    }

    // Buscar todas las ventas cerradas activas
    const ventasCerradas = await ventaCerradaRepository.find({
      where: { id: In(ids), ...whereActivas }
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
          observaciones: observaciones || venta.observaciones,
          grupo_cierre
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
          observaciones: venta.observaciones,
          grupo_cierre: venta.grupo_cierre
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

export const desagruparVentasCerradas = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de ventas a desagrupar'
      });
    }

    const ventasCerradas = await ventaCerradaRepository.find({
      where: { id: In(ids), ...whereActivas }
    });

    if (ventasCerradas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron ventas para desagrupar'
      });
    }

    const ventasSinGrupo = ventasCerradas.filter(v => !v.grupo_cierre);
    if (ventasSinGrupo.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Algunas ventas no pertenecen a un grupo',
        ventas_sin_grupo: ventasSinGrupo.map(v => v.id)
      });
    }

    const ventasNoFinalizadas = ventasCerradas.filter(v => v.estado !== 'Finalizado');
    if (ventasNoFinalizadas.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden desagrupar ventas finalizadas',
        ventas_no_finalizadas: ventasNoFinalizadas.map(v => v.id)
      });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const venta of ventasCerradas) {
        await queryRunner.manager.update(VentaCerrada, venta.id, {
          grupo_cierre: null,
          estado: 'Rendicion final pendiente'
        });
      }

      await queryRunner.commitTransaction();

      const ventasActualizadas = await ventaCerradaRepository.find({
        where: { id: In(ids) },
        relations: ['repartidor']
      });

      res.json({
        success: true,
        message: 'Ventas desagrupadas correctamente',
        ventas_cerradas: ventasActualizadas.map(venta => ({
          id: venta.id,
          proceso_id: venta.proceso_id,
          estado: venta.estado,
          grupo_cierre: venta.grupo_cierre,
          repartidor: venta.repartidor ? {
            id: venta.repartidor.id,
            nombre: venta.repartidor.nombre
          } : null
        }))
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error al desagrupar ventas cerradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desagrupar las ventas cerradas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const eliminarVentaCerrada = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const ventaCerrada = await ventaCerradaRepository.findOne({
      where: { id: parseInt(id), ...whereActivas }
    });

    if (!ventaCerrada) {
      return res.status(404).json({ 
        success: false,
        message: 'Venta cerrada no encontrada' 
      });
    }

    // No permitir anular rendiciones ya finalizadas (datos contables consolidados)
    if (ventaCerrada.estado === 'Finalizado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede anular una venta con rendición finalizada. Primero desagrúpela si necesita corregirla.'
      });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Soft delete: se anula el cierre sin tocar carga, descarga ni envases
      await queryRunner.manager.update(VentaCerrada, ventaCerrada.id, {
        deleted_at: new Date()
      });

      // Desactivar movimiento contable asociado (si existe)
      await queryRunner.manager
        .createQueryBuilder()
        .update('movimientos')
        .set({ activo: false })
        .where('tipo = :tipo', { tipo: 'CIERRE_VENTA' })
        .andWhere('activo = :activo', { activo: true })
        .andWhere("JSON_EXTRACT(detalles, '$.venta_cerrada_id') = :ventaId", {
          ventaId: ventaCerrada.id
        })
        .execute();

      await queryRunner.commitTransaction();

      res.json({
        success: true,
        message: 'Venta anulada correctamente. La carga y descarga asociadas se conservaron.'
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error al anular venta cerrada:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al anular la venta cerrada',
      error: (error as Error).message
    });
  }
};

export const restaurarVentaCerrada = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const ventaCerrada = await ventaCerradaRepository.findOne({
      where: { id }
    });

    if (!ventaCerrada) {
      return res.status(404).json({
        success: false,
        message: 'Venta cerrada no encontrada'
      });
    }

    if (!ventaCerrada.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'La venta no está anulada'
      });
    }

    const ventaActivaMismoProceso = await ventaCerradaRepository.findOne({
      where: { proceso_id: ventaCerrada.proceso_id, ...whereActivas }
    });
    if (ventaActivaMismoProceso) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una venta activa para este proceso. No se puede rehabilitar.'
      });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(VentaCerrada, ventaCerrada.id, {
        deleted_at: null
      });

      await queryRunner.manager
        .createQueryBuilder()
        .update('movimientos')
        .set({ activo: true })
        .where('tipo = :tipo', { tipo: 'CIERRE_VENTA' })
        .andWhere('activo = :activo', { activo: false })
        .andWhere("JSON_EXTRACT(detalles, '$.venta_cerrada_id') = :ventaId", {
          ventaId: ventaCerrada.id
        })
        .execute();

      await queryRunner.commitTransaction();

      res.json({
        success: true,
        message: 'Venta rehabilitada correctamente. Vuelve a contar en los totales.'
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error al rehabilitar venta cerrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rehabilitar la venta cerrada',
      error: (error as Error).message
    });
  }
}; 