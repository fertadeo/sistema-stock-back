import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
