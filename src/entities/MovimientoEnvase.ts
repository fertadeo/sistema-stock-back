import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Clientes } from './Clientes';
import { Productos } from './Productos';
import { Repartidor } from './Repartidor';

export enum TipoMovimientoEnvase {
    PRESTAMO = 'PRESTAMO',
    DEVOLUCION = 'DEVOLUCION',
    AJUSTE = 'AJUSTE'
}

@Entity('movimientos_envases')
export class MovimientoEnvase {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @ManyToOne(() => Clientes)
    @JoinColumn({ name: 'cliente_id' })
    cliente!: Clientes;

    @Column()
    cliente_id!: number;

    @ManyToOne(() => Productos)
    @JoinColumn({ name: 'producto_id' })
    producto!: Productos;

    @Column()
    producto_id!: number;

    @Column()
    producto_nombre!: string;

    @Column()
    capacidad!: number; // en litros

    @Column()
    cantidad!: number; // cantidad positiva para préstamo, negativa para devolución

    @Column({
        type: 'enum',
        enum: TipoMovimientoEnvase
    })
    tipo!: TipoMovimientoEnvase;

    @Column({ nullable: true })
    repartidor_id!: number;

    @ManyToOne(() => Repartidor, { nullable: true })
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @CreateDateColumn()
    fecha_movimiento!: Date;

    @Column({ type: 'text', nullable: true })
    observaciones!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    venta_relacionada_id!: string; // UUID de venta relacionada si aplica
}
