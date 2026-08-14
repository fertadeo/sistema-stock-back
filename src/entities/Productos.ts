import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoProducto {
  VENTA_PUBLICO = 'venta_publico',
  INSUMO = 'insumo',
}

export function normalizarTipoProducto(valor: unknown): TipoProducto {
  const n = String(valor ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return n === 'insumo' ? TipoProducto.INSUMO : TipoProducto.VENTA_PUBLICO;
}

@Entity()
export class Productos { 
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombreProducto!: string;

  @Column()
  precioPublico!: number;

  @Column()
  precioRevendedor!: number;

  @Column()
  cantidadStock!: number;

  @Column()
  descripcion!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: TipoProducto.VENTA_PUBLICO,
  })
  tipoProducto!: TipoProducto;
}
