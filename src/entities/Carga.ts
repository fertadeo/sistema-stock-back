import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Repartidor } from "./Repartidor";

@Entity('cargas')
export class Carga {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    repartidor_id!: number;

    @ManyToOne(() => Repartidor)
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @Column('json')
    items!: {
        producto_id: number;
        cantidad: number;
        nombre_producto: string;
    }[];

    @CreateDateColumn()
    fecha_carga!: Date;

    @Column({ default: 'pendiente' })
    estado!: 'pendiente' | 'completada' | 'cancelada';
} 