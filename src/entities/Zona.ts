import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Clientes } from './Clientes';

@Entity('zonas')
export class Zona {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column()
    nombre: string = '';

    @OneToMany(() => Clientes, cliente => cliente.zona)
    clientes!: Clientes[];
} 