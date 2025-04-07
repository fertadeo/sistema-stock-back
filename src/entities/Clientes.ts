import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { EnvasesPrestados } from './EnvasesPrestados';
import { Zona } from './Zona';

@Entity()
export class Clientes {
  @PrimaryGeneratedColumn()
    id: number = 0;
    
  @Column()
    dni: string = ''; 

  @Column()
    nombre: string = '';

  @Column()
    email: string = '';

  @Column()
    telefono: string = '';

  @Column()
    direccion: string = '';

  @ManyToOne(() => Zona)
  @JoinColumn({ name: 'zona' })
    zona!: Zona;

  @Column()
    fecha_alta: Date = new Date();

  @Column()
    estado: boolean = true;

  @Column()
    repartidor: string = '';

  @Column()
    dia_reparto: string = '';

  @OneToMany(() => EnvasesPrestados, envase => envase.cliente)
    envases_prestados!: EnvasesPrestados[];
}
