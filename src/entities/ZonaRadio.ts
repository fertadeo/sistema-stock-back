import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TipoZonaRadio = 'radio' | 'barrio' | 'poligono';

export type PuntoPoligono = { lat: number; lng: number };

@Entity('zonas_radio')
export class ZonaRadio {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  /** radio | barrio | poligono */
  @Column({ type: 'varchar', length: 20, default: 'radio' })
  tipo!: TipoZonaRadio;

  /** Centroide (también centro del círculo si tipo=radio). */
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitud!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitud!: number;

  /** Solo para tipo radio. Null en barrio/poligono. */
  @Column({ type: 'int', nullable: true })
  radio_metros!: number | null;

  /** Vértices del polígono (barrio o trazado manual). */
  @Column({ type: 'json', nullable: true })
  poligono!: PuntoPoligono[] | null;

  /** Nombre del barrio de negocio cuando tipo=barrio. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  barrio_nombre!: string | null;

  /** Cómo se obtuvieron los límites: osm | clientes | manual */
  @Column({ type: 'varchar', length: 20, nullable: true })
  origen_limites!: string | null;

  @Column({ type: 'varchar', length: 20, default: '#0d9488' })
  color!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  repartidor!: string | null;

  @Column({ type: 'tinyint', width: 1, default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizado_at!: Date;
}
