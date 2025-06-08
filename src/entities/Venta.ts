import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

// Primero definimos la interfaz para el producto
interface ProductoVenta {
    producto_id: string;
    cantidad: number;
    precio_unitario: string;
    subtotal: string;
    nombre?: string; // Opcional para cuando necesitemos el nombre
}

@Entity()
export class Venta {
    @PrimaryGeneratedColumn('uuid')
    venta_id!: string;

    @Column({ nullable: true })
    revendedor_nombre!: string;

    @Column({ nullable: true })
    repartidor_id!: string;

    @Column('json')
    productos!: ProductoVenta[];

    @Column()
    monto_total!: string;

    @Column({
        type: 'enum',
        enum: ['efectivo', 'transferencia', 'debito', 'credito']
    })
    medio_pago!: 'efectivo' | 'transferencia' | 'debito' | 'credito';

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

    @Column({
        type: 'enum',
        enum: ['LOCAL', 'REPARTIDOR', 'REVENDEDOR'],
        default: 'LOCAL'
    })
    tipo!: 'LOCAL' | 'REPARTIDOR' | 'REVENDEDOR';

    @Column({ nullable: true })
    cliente_id!: string;

    @Column({ nullable: true })
    nombre_cliente!: string;

    @Column({ nullable: true })
    telefono_cliente!: string;

    @Column({ nullable: true })
    observaciones!: string;
}
