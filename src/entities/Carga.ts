import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany } from "typeorm";
import { Repartidor } from "./Repartidor";
import { CargaItem } from "./CargaItem";

@Entity('cargas')
export class Carga {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    repartidor_id!: number;

    @ManyToOne(() => Repartidor)
    @JoinColumn({ name: 'repartidor_id' })
    repartidor!: Repartidor;

    @OneToMany(() => CargaItem, item => item.carga, { cascade: true })
    items!: CargaItem[];

    @CreateDateColumn()
    fecha_carga!: Date;

    @Column({ default: 'pendiente' })
    estado!: 'pendiente' | 'completada' | 'cancelada';
} 