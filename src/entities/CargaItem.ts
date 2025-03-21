import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Carga } from "./Carga";
import { Productos } from "./Productos";

@Entity('carga_items')
export class CargaItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    carga_id!: number;

    @Column()
    producto_id!: number;

    @ManyToOne(() => Carga, carga => carga.items)
    @JoinColumn({ name: 'carga_id' })
    carga!: Carga;

    @ManyToOne(() => Productos)
    @JoinColumn({ name: 'producto_id' })
    producto!: Productos;

    @Column()
    cantidad!: number;
    nombre_producto: string | undefined;
} 