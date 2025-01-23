import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('repartidores')
export class Repartidor {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    nombre!: string;

    @Column()
    telefono!: string;

    @Column()
    zona_reparto!: string;

    @Column({ default: true })
    activo!: boolean;

    @CreateDateColumn()
    fecha_registro!: Date;
}
