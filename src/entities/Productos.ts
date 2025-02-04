import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';


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
}
