// controllers/presupuestoController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';  // Tu configuración de base de datos
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Presupuesto {
  numeroPresupuesto: string;
  clienteId: number;
  fecha: Date;
  productos: Array<{
    id: number;
    nombre: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    detalles?: {
      sistema: string;
      detalle?: string;
      caidaPorDelante?: string;
      colorSistema?: string;
      ladoComando?: string;
      tipoTela?: string;
      soporteIntermedio?: boolean;
      soporteDoble?: boolean;
    };
  }>;
  total: number;
}

export const presupuestoController = {
  // Obtener presupuestos por ID de cliente
  getPresupuestosByCliente: async (req: Request, res: Response) => {
    const clienteId = req.params.clienteId;
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const presupuestos = await queryRunner.query(`
        SELECT 
          p.id,
          p.numero_presupuesto,
          p.fecha,
          p.total,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.email as cliente_email
        FROM presupuestos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE p.cliente_id = ?`, [clienteId]);

      const presupuestosConItems = await Promise.all(
        presupuestos.map(async (presupuesto: any) => {
          const items = await queryRunner.query(`
            SELECT 
              pi.id,
              pi.nombre,
              pi.descripcion,
              pi.cantidad,
              pi.precio_unitario,
              pi.subtotal,
              pi.detalles
            FROM presupuesto_items pi
            WHERE pi.presupuesto_id = ?`, [presupuesto.id]);

          return {
            ...presupuesto,
            items: items.map((item: any) => ({
              ...item,
              detalles: JSON.parse(item.detalles || '{}')
            }))
          };
        })
      );

      await queryRunner.commitTransaction();
      res.json({ success: true, data: presupuestosConItems });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      res.status(500).json({ success: false, error });
    } finally {
      await queryRunner.release();
    }
  },

  // Crear nuevo presupuesto
  createPresupuesto: async (req: Request, res: Response) => {
    const presupuesto = req.body;
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const presupuestoResult = await queryRunner.query(`
        INSERT INTO presupuestos (numero_presupuesto, cliente_id, fecha, total, presupuesto_json)
        VALUES (?, ?, ?, ?, ?)`,
        [
          presupuesto.numeroPresupuesto,
          presupuesto.clienteId,
          new Date(),
          presupuesto.total,
          JSON.stringify(presupuesto)
        ]
      );

      const presupuestoId = presupuestoResult.insertId;

      await Promise.all(
        presupuesto.productos.map(async (producto: any) => {
          // Si es un producto del catálogo (como COLOCACIONES)
          if (producto.nombre === 'COLOCACIONES') {
            return queryRunner.query(`
              INSERT INTO presupuesto_items 
              (presupuesto_id, producto_id, nombre, descripcion, cantidad, precio_unitario, subtotal, detalles)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                presupuestoId,
                producto.id,
                producto.nombre,
                producto.descripcion,
                producto.cantidad,
                producto.precioUnitario,
                producto.subtotal,
                JSON.stringify(producto.detalles || {})
              ]
            );
          } else {
            // Para productos personalizados (cortinas)
            return queryRunner.query(`
              INSERT INTO presupuesto_items 
              (presupuesto_id, producto_id, nombre, descripcion, cantidad, precio_unitario, subtotal, detalles)
              VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
              [
                presupuestoId,
                producto.nombre,
                producto.descripcion,
                producto.cantidad,
                producto.precioUnitario,
                producto.subtotal,
                JSON.stringify(producto.detalles || {})
              ]
            );
          }
        })
      );

      await queryRunner.commitTransaction();
      res.status(201).json({ 
        success: true, 
        presupuestoId,
        message: "Presupuesto creado exitosamente" 
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error al crear presupuesto:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error al crear el presupuesto",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      await queryRunner.release();
    }
  },

  // Agregar esta nueva función
  getAllPresupuestos: async (req: Request, res: Response) => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const presupuestos = await queryRunner.query(`
        SELECT 
          p.id,
          p.numero_presupuesto,
          p.fecha,
          p.total,
          c.id as cliente_id,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.email as cliente_email
        FROM presupuestos p
        JOIN clientes c ON p.cliente_id = c.id
        ORDER BY p.fecha DESC`);

      const presupuestosConItems = await Promise.all(
        presupuestos.map(async (presupuesto: any) => {
          const items = await queryRunner.query(`
            SELECT 
              pi.id,
              pi.nombre,
              pi.descripcion,
              pi.cantidad,
              pi.precio_unitario,
              pi.subtotal,
              pi.detalles
            FROM presupuesto_items pi
            WHERE pi.presupuesto_id = ?`, [presupuesto.id]);

          return {
            ...presupuesto,
            items: items.map((item: any) => ({
              ...item,
              detalles: JSON.parse(item.detalles || '{}')
            }))
          };
        })
      );

      await queryRunner.commitTransaction();
      res.json({ success: true, data: presupuestosConItems });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      res.status(500).json({ 
        success: false, 
        message: "Error al obtener los presupuestos",
        error 
      });
    } finally {
      await queryRunner.release();
    }
  },

  // Agregar esta nueva función al controlador
  getPresupuestosPorMes: async (req: Request, res: Response) => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const presupuestosPorMes = await queryRunner.query(`
        SELECT 
          DATE_FORMAT(fecha, '%Y-%m') as mes,
          COUNT(*) as total_presupuestos,
          SUM(total) as suma_total,
          COUNT(DISTINCT cliente_id) as total_clientes
        FROM presupuestos
        WHERE fecha >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(fecha, '%Y-%m')
        ORDER BY mes DESC
      `);

      await queryRunner.commitTransaction();
      res.json({ 
        success: true, 
        data: presupuestosPorMes.map((item: any) => ({
          ...item,
          mes: item.mes,
          total_presupuestos: Number(item.total_presupuestos),
          suma_total: Number(item.suma_total),
          total_clientes: Number(item.total_clientes)
        }))
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error al obtener estadísticas por mes:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error al obtener estadísticas de presupuestos por mes",
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      await queryRunner.release();
    }
  }
};