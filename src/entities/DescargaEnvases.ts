import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Descarga } from "./Descarga";
import { Productos } from "./Productos";

@Entity('descarga_envases')
export class DescargaEnvases {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    descarga_id!: number;

    @Column()
    producto_id!: number;

    @ManyToOne(() => Descarga, descarga => descarga.envases)
    @JoinColumn({ name: 'descarga_id' })
    descarga!: Descarga;

    @ManyToOne(() => Productos)
    @JoinColumn({ name: 'producto_id' })
    producto!: Productos;

    @Column()
    envases_recuperados!: number;

    @Column()
    deficit_envases!: number;

    @OneToMany(() => DescargaEnvases, envase => envase.descarga, { cascade: true })
    envases!: DescargaEnvases[];
} 