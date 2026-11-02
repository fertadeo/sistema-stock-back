import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('avisos_repartidor')
export class AvisoRepartidor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  repartidor_id!: number;

  @Column({ type: 'varchar', length: 40, default: 'cobro_historico' })
  tipo!: string;

  @Column({ type: 'varchar', length: 160 })
  titulo!: string;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto!: number | null;

  @Column({ type: 'int', nullable: true })
  cliente_id!: number | null;

  @Column({ type: 'int', nullable: true })
  cobro_id!: number | null;

  @Column({ type: 'int', nullable: true })
  cobrado_por_repartidor_id!: number | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  leido!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_at!: Date;
}
