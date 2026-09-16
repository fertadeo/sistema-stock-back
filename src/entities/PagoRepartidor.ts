import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Repartidor } from './Repartidor';
import { User } from './User';

@Entity('pagos_repartidor')
export class PagoRepartidor {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @ManyToOne(() => Repartidor)
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @Column()
    repartidor_id!: number;

    @Column({ nullable: true })
    repartidor_nombre!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    monto!: number;

    @Column({
        type: 'enum',
        enum: ['efectivo', 'transferencia', 'debito', 'credito'],
        default: 'efectivo'
    })
    medio_pago!: 'efectivo' | 'transferencia' | 'debito' | 'credito';

    @Column({ type: 'text', nullable: true })
    observaciones!: string;

    @Column({ nullable: true })
    usuario_registro_id!: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuario_registro_id' })
    usuario_registro!: User;

    @CreateDateColumn()
    fecha_pago!: Date;
}
