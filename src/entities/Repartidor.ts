import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('repartidores')
export class Repartidor {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    nombre!: string;

    @Column()
    telefono!: string;

    @Column()
    zona_reparto!: string;

    @Column({ default: true })
    activo!: boolean;

    /** Color Hex del pin en el mapa (estable por ficha). */
    @Column({ type: 'varchar', length: 20, nullable: true })
    color_pin!: string | null;

    @CreateDateColumn()
    fecha_registro!: Date;
}
