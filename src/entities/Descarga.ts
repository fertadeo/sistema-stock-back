import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Repartidor } from './Repartidor';
import { Carga } from './Carga';
import { DescargaEnvases } from './DescargaEnvases';

@Entity('descarga')
export class Descarga {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Repartidor, { nullable: false })
  @JoinColumn([{ name: 'repartidor_id', referencedColumnName: 'id' }])
  repartidor!: Repartidor;

  @ManyToOne(() => Carga, { nullable: false })
  @JoinColumn([{ name: 'carga_id', referencedColumnName: 'id' }])
  carga!: Carga;

  @Column('json')
  productos_devueltos!: Array<{producto_id: number, cantidad: number}>;

  @Column('json')
  precios_unitarios!: Array<{producto_id: number, precio_unitario: number}>;

  @Column()
  productos_vendidos!: number;

  @OneToMany(() => DescargaEnvases, envase => envase.descarga, { cascade: true })
  envases!: DescargaEnvases[];

  @Column({ nullable: true })
  observaciones?: string;

  @CreateDateColumn()
  fecha_descarga!: Date;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'finalizado'],
    default: 'pendiente'
  })
  estado_cuenta!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monto_total!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ganancia_repartidor!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ganancia_empresa!: number;

  @Column({ type: 'int', nullable: true })
  porcentaje_repartidor!: number;

  @Column({ type: 'int', nullable: true })
  porcentaje_empresa!: number;
} 