import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Clientes } from './Clientes';
import { Repartidor } from './Repartidor';

@Entity('visitas_no_encontradas')
export class VisitaNoEncontrado {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @ManyToOne(() => Clientes)
    @JoinColumn({ name: 'cliente_id' })
    cliente!: Clientes;

    @Column()
    cliente_id!: number;

    @Column({ nullable: true })
    repartidor_id!: number;

    @ManyToOne(() => Repartidor, { nullable: true })
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @Column({ type: 'text', default: 'Cliente no encontrado en la visita' })
    observaciones!: string;

    @CreateDateColumn()
    fecha_registro!: Date;

    @Column({ type: 'timestamp', nullable: true })
    fecha_visita!: Date; // Fecha/hora de la visita (desde el cliente)
}
