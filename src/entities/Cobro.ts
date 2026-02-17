import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Clientes } from './Clientes';
import { Repartidor } from './Repartidor';

@Entity('cobros')
export class Cobro {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @ManyToOne(() => Clientes)
    @JoinColumn({ name: 'cliente_id' })
    cliente!: Clientes;

    @Column()
    cliente_id!: number;

    @Column({ nullable: true })
    nombre_cliente!: string;

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
    repartidor_id!: number;

    @ManyToOne(() => Repartidor, { nullable: true })
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @CreateDateColumn()
    fecha_cobro!: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    venta_relacionada_id!: string; // UUID de venta relacionada si aplica
}
