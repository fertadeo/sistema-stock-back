import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Clientes } from './Clientes';

@Entity('repartidor_ruta_paradas')
export class RepartidorRutaParada {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  user_id!: number;

  @Column({ type: 'int' })
  cliente_id!: number;

  @Column({ type: 'text', nullable: true })
  comentario!: string | null;

  @Column({ type: 'time', nullable: true })
  hora_alerta!: string | null;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'tinyint', default: 0 })
  alerta_enviada!: boolean;

  @Column({ type: 'tinyint', default: 0 })
  visitado!: boolean;

  @Column({ type: 'int', default: 0 })
  orden!: number;

  @CreateDateColumn({ type: 'datetime' })
  creado_at!: Date;

  @ManyToOne(() => Clientes, { eager: true })
  @JoinColumn({ name: 'cliente_id' })
  cliente!: Clientes;
}
