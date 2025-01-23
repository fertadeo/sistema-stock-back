import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class Venta {
    @PrimaryGeneratedColumn('uuid')
    venta_id!: string;

    @Column({ nullable: true })
    revendedor_id!: string;

    @Column({ nullable: true })
    repartidor_id!: string;

    @Column('json')
    productos!: {
        producto_id: string;
        cantidad: number;
        precio_unitario: string;
        subtotal: string;
    }[];

    @Column()
    monto_total!: string;

    @Column({
        type: 'enum',
        enum: ['efectivo', 'transferencia']
    })
    medio_pago!: 'efectivo' | 'transferencia';

    @Column({
        type: 'enum',
        enum: ['total', 'parcial']
    })
    forma_pago!: 'total' | 'parcial';

    @Column()
        saldo!: boolean;

    @Column({ nullable: true })
    saldo_monto!: string;

    @CreateDateColumn()
    fecha_venta!: Date;
}
