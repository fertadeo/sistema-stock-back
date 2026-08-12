import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('zonas_radio')
export class ZonaRadio {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitud!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitud!: number;

  /** Radio de la zona en metros (distancia máxima del repartidor). */
  @Column({ type: 'int' })
  radio_metros!: number;

  @Column({ type: 'varchar', length: 20, default: '#0d9488' })
  color!: string;

  /** Nombre del repartidor asociado (mismo criterio que clientes.repartidor). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  repartidor!: string | null;

  @Column({ type: 'tinyint', width: 1, default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizado_at!: Date;
}
