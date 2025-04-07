import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Clientes } from './Clientes';
import { Productos } from './Productos';

@Entity()
export class EnvasesPrestados {
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
    cantidad!: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fecha_prestamo!: Date;
}