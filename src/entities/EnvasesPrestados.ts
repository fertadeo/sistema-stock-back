import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Clientes } from './Clientes';

@Entity()
export class EnvasesPrestados {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @ManyToOne(() => Clientes)
    @JoinColumn({ name: 'cliente_id' })
    cliente!: Clientes;

    @Column()
    cliente_id!: number;

    @Column()
    tipo_producto!: string; // 'AGUA' o 'SODA'

    @Column()
    capacidad!: number; // en litros

    @Column()
    cantidad!: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fecha_prestamo!: Date;
}