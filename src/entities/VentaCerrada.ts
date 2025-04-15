import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Repartidor } from './Repartidor';

@Entity('ventas_cerradas')
export class VentaCerrada {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column()
    proceso_id: number = 0;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fecha_cierre: Date = new Date();

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total_venta: number = 0;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    comision_porcentaje: number = 0;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    ganancia_repartidor: number = 0;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    ganancia_fabrica: number = 0;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    monto_efectivo: number = 0;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    monto_transferencia: number = 0;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    balance_fiado: number = 0;

    @Column({ nullable: true })
    repartidor_id: number = 0;

    @Column({ type: 'text', nullable: true })
    observaciones: string = '';

    @CreateDateColumn()
    created_at: Date = new Date();

    @ManyToOne(() => Repartidor)
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @Column({ 
        type: 'varchar', 
        default: 'Rendicion final pendiente',
        enum: ['Rendicion final pendiente', 'Finalizado'] 
    })
    estado!: string;
} 