import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';


@Entity()
export class Productos { 
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombreProducto!: string;

  @Column()
  precio!: number;
}
