import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Producto } from './Producto';

@Entity('proveedores')
export class Proveedores {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombreProveedores!: string;

  @OneToMany(() => Producto, (producto) => producto.proveedor)
    productos!: Producto[];
}
