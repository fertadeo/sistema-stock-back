import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/** Fila única (id = 1) con ajustes globales de la cuenta. */
@Entity('configuracion_sistema')
export class ConfiguracionSistema {
  @PrimaryColumn()
  id: number = 1;

  /**
   * Si es true, los repartidores solo ven (y operan sobre) clientes asignados a ellos.
   * Por defecto false: ven todos los clientes.
   */
  @Column({ type: 'boolean', default: false })
  repartidor_solo_clientes_propios: boolean = false;

  @UpdateDateColumn({ name: 'actualizado_at' })
  actualizado_at!: Date;
}
