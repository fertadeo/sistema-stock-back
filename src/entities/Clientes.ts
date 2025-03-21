import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { EnvasesPrestados } from './EnvasesPrestados';

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
    direccion: string = '' ;

  @Column()
    zona: string = '';

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
