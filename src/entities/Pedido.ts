import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
  } from 'typeorm';
  import { Clientes } from './Clientes';
  
  @Entity()
  export class Pedido {
    @PrimaryGeneratedColumn()
    id!: number;
  
    @Column()
    cliente_id!: number;
  
    @Column()
    fecha_pedido!: Date;
  
    @Column('decimal', { precision: 10, scale: 2 })
    total!: number;
  
    @ManyToOne(() => Clientes, (cliente) => cliente.pedidos)
    cliente!: Clientes;
  }
  