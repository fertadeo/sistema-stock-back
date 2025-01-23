import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';


@Entity()
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombreProducto!: string;

  @Column()
  cantidad_stock!: string;

  @Column()
  descripcion!: string;

  @Column()
  precioCosto!: string;

  @Column()
  precio!: string;

  @Column()
  divisa!: string;

  @Column()
  descuento!: number;

  @Column()
  rubro_id!: string;

  @Column()
  sistema_id!: string;

  @Column()
  disponible!: boolean;

}