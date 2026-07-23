import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserRole } from '../constants/roles';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  nombre?: string;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @Column()
  nivel_usuario!: number;

  @Column({ type: 'varchar', length: 20, default: 'admin' })
  role!: UserRole;

  @Column({ type: 'varchar', length: 36, nullable: true })
  repartidor_id!: string | null;

  /**
   * Solo aplica a role=repartidor.
   * false (default): ve todos los clientes.
   * true: solo ve clientes asignados a él (útil para empleados).
   */
  @Column({ type: 'boolean', default: false })
  solo_clientes_propios!: boolean;

  @Column({ nullable: true })
  last_login?: Date;
}
