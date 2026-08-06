import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoProducto {
  VENTA_PUBLICO = 'venta_publico',
  INSUMO = 'insumo',
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
    type: 'enum',
    enum: TipoProducto,
    default: TipoProducto.VENTA_PUBLICO,
  })
  tipoProducto!: TipoProducto;
}
