import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("revendedores")
export class Revendedor {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    nombre!: string;
}  