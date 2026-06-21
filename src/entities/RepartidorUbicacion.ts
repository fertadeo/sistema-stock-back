import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('repartidor_ubicaciones')
export class RepartidorUbicacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  repartidor_id!: number;

  @Column({ type: 'varchar', length: 100 })
  repartidor_nombre!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitud!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitud!: number;

  @UpdateDateColumn({ type: 'datetime' })
  actualizado_at!: Date;
}
