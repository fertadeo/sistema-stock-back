import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TipoOperacion {
    VENTA_RAPIDA = 'VENTA_RAPIDA',
    COBRO_RAPIDO = 'COBRO_RAPIDO',
    FIADO_RAPIDO = 'FIADO_RAPIDO',
    MOVIMIENTO_ENVASE = 'MOVIMIENTO_ENVASE'
}

export enum EstadoSincronizacion {
    PENDIENTE = 'PENDIENTE',
    SINCRONIZADO = 'SINCRONIZADO',
    ERROR = 'ERROR',
    DUPLICADO = 'DUPLICADO'
}

@Entity('operaciones_pendientes')
export class OperacionPendiente {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column({ type: 'varchar', length: 255, unique: true })
    operacion_id!: string; // UUID generado en el cliente

    @Column({
        type: 'enum',
        enum: TipoOperacion
    })
    tipo!: TipoOperacion;

    @Column('json')
    datos_operacion!: Record<string, any>; // Datos completos de la operación

    @Column({
        type: 'enum',
        enum: EstadoSincronizacion,
        default: EstadoSincronizacion.PENDIENTE
    })
    estado!: EstadoSincronizacion;

    @Column({ nullable: true })
    repartidor_id!: number;

    @Column({ nullable: true })
    dispositivo_id!: string; // Identificador único del dispositivo

    @Column({ type: 'timestamp', nullable: true })
    fecha_operacion_local!: Date; // Fecha/hora cuando se creó en el dispositivo

    @Column({ type: 'text', nullable: true })
    error_mensaje!: string; // Mensaje de error si falló la sincronización

    @Column({ type: 'varchar', length: 255, nullable: true })
    resultado_id!: string; // ID del registro creado después de sincronizar (venta_id, cobro_id, etc.)

    @CreateDateColumn()
    fecha_creacion!: Date; // Fecha cuando se recibió en el servidor

    @UpdateDateColumn()
    fecha_actualizacion!: Date; // Última actualización

    @Column({ type: 'int', default: 0 })
    intentos_sincronizacion: number = 0; // Contador de intentos fallidos
}
