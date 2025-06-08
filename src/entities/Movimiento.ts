import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum TipoMovimiento {
    VENTA_LOCAL = 'VENTA_LOCAL',
    GASTO = 'GASTO',
    NUEVO_CLIENTE = 'NUEVO_CLIENTE',
    NUEVO_PRODUCTO = 'NUEVO_PRODUCTO',
    MODIFICACION_PRODUCTO = 'MODIFICACION_PRODUCTO',
    MODIFICACION_CLIENTE = 'MODIFICACION_CLIENTE',
    CIERRE_VENTA = 'CIERRE_VENTA',
    RENDICION = 'RENDICION'
}

@Entity('movimientos')
export class Movimiento {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column({
        type: 'enum',
        enum: TipoMovimiento
    })
    tipo: TipoMovimiento = TipoMovimiento.VENTA_LOCAL;

    @Column('text')
    descripcion: string = '';

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    monto?: number;

    @Column('json', { nullable: true })
    detalles?: Record<string, any>;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'usuario_id' })
    usuario!: User;

    @Column()
    usuario_id: number = 0;

    @CreateDateColumn()
    fecha: Date = new Date();

    @Column({ default: true })
    activo: boolean = true;
} 