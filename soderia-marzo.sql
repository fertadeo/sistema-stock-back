-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 21-03-2025 a las 19:56:07
-- Versión del servidor: 10.4.27-MariaDB
-- Versión de PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `soderia`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cargas`
--

CREATE TABLE `cargas` (
  `id` int(11) NOT NULL,
  `repartidor_id` int(11) NOT NULL,
  `fecha_carga` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('pendiente','completada','cancelada') DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cargas`
--

INSERT INTO `cargas` (`id`, `repartidor_id`, `fecha_carga`, `estado`) VALUES
(4, 2, '2025-03-10 20:29:57', 'completada'),
(5, 2, '2025-03-10 21:36:54', 'completada'),
(6, 4, '2025-03-10 21:55:13', 'completada'),
(7, 2, '2025-03-10 21:59:13', 'completada'),
(8, 2, '2025-03-10 22:03:50', 'completada'),
(9, 4, '2025-03-10 22:10:29', 'completada'),
(10, 4, '2025-03-10 22:32:37', 'completada'),
(11, 3, '2025-03-11 03:56:26', 'completada'),
(12, 2, '2025-03-11 04:29:58', 'completada'),
(13, 4, '2025-03-11 04:44:39', 'completada'),
(14, 4, '2025-03-11 04:46:44', 'completada'),
(15, 4, '2025-03-11 04:51:03', 'completada'),
(16, 4, '2025-03-11 04:52:33', 'completada'),
(17, 4, '2025-03-11 04:53:04', 'completada'),
(18, 4, '2025-03-11 04:53:56', 'completada'),
(19, 4, '2025-03-11 05:12:14', 'completada'),
(20, 3, '2025-03-11 17:38:04', 'completada'),
(21, 4, '2025-03-11 18:32:43', 'completada'),
(22, 4, '2025-03-11 21:06:19', 'completada'),
(23, 3, '2025-03-11 21:45:21', 'completada'),
(24, 2, '2025-03-13 22:26:12', 'completada'),
(25, 2, '2025-03-16 16:36:17', 'completada');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carga_items`
--

CREATE TABLE `carga_items` (
  `id` int(11) NOT NULL,
  `carga_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `carga_items`
--

INSERT INTO `carga_items` (`id`, `carga_id`, `producto_id`, `cantidad`) VALUES
(1, 4, 1, 50),
(2, 4, 2, 30),
(3, 5, 1, 50),
(4, 5, 2, 30),
(5, 6, 1, 19),
(6, 6, 2, 5),
(7, 7, 1, 4),
(8, 8, 1, 20),
(9, 8, 3, 48),
(10, 8, 5, 6),
(11, 9, 1, 5),
(12, 10, 1, 6),
(13, 11, 1, 24),
(14, 11, 2, 4),
(15, 11, 3, 108),
(16, 12, 1, 24),
(17, 12, 2, 4),
(18, 12, 3, 108),
(19, 13, 1, 10),
(20, 13, 2, 4),
(21, 13, 3, 108),
(22, 14, 1, 10),
(23, 14, 2, 4),
(24, 14, 3, 110),
(25, 15, 1, 10),
(26, 15, 2, 2),
(27, 16, 2, 2),
(28, 17, 3, 12),
(29, 18, 1, 4),
(30, 18, 2, 2),
(31, 18, 3, 6),
(32, 19, 1, 10),
(33, 19, 2, 5),
(34, 19, 3, 96),
(35, 20, 1, 20),
(36, 20, 2, 9),
(37, 20, 3, 60),
(38, 21, 1, 20),
(39, 21, 2, 10),
(40, 21, 3, 120),
(41, 22, 1, 20),
(42, 22, 2, 10),
(43, 22, 3, 30),
(44, 23, 1, 20),
(45, 23, 2, 5),
(46, 23, 3, 60),
(47, 24, 1, 20),
(48, 24, 2, 3),
(49, 25, 1, 10),
(50, 25, 2, 5),
(51, 25, 3, 90),
(52, 25, 4, 60);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `zona` varchar(100) DEFAULT NULL,
  `fecha_alta` datetime DEFAULT current_timestamp(),
  `estado` tinyint(1) DEFAULT 1,
  `repartidor` varchar(255) DEFAULT NULL,
  `dia_reparto` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `dni`, `nombre`, `email`, `telefono`, `direccion`, `zona`, `fecha_alta`, `estado`, `repartidor`, `dia_reparto`) VALUES
(6, NULL, 'sandra', NULL, '3584820675', NULL, 'Las Quintas', '2025-02-10 20:27:27', 1, NULL, NULL),
(7, NULL, 'Fernando Tadeo', 'fernandotadeos@gmail.com', '03541222719', 'Av. Colón 1494', 'Banda Norte', '2025-02-11 17:14:41', 1, NULL, NULL),
(8, NULL, 'Fernando', 'fernandotadeos@gmail.com', '03541222719', 'Av. Colón 1494', 'Abilene', '2025-03-20 22:51:49', 1, NULL, NULL),
(9, NULL, 'Tadeo', 'fernandotadeos@gmail.com', '03541222719', 'Av. Colón 1494', 'Abilene', '2025-03-20 23:07:58', 1, '0', '6'),
(10, NULL, 'pepito', 'fernandotadeos@gmail.com', '03541222719', 'Av. Colón 1494', 'Alberdi', '2025-03-20 23:09:57', 1, 'Gustavo Careaga', 'Lunes - Mañana'),
(11, NULL, 'Emi', 'fernandotadeos@gmail.com', '03541222719', 'Av. Colón 1494', 'Abilene', '2025-03-20 23:13:02', 1, 'Axel Torres', 'Miércoles - Tarde');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `descarga`
--

CREATE TABLE `descarga` (
  `id` int(11) NOT NULL,
  `repartidor_id` int(11) DEFAULT NULL,
  `carga_id` int(11) DEFAULT NULL,
  `productos_devueltos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`productos_devueltos`)),
  `productos_vendidos` int(11) NOT NULL,
  `envases_recuperados` int(11) NOT NULL,
  `deficit_envases` int(11) NOT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `fecha_descarga` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado_cuenta` enum('pendiente','finalizado') DEFAULT 'pendiente',
  `ganancia_repartidor` decimal(10,2) DEFAULT NULL,
  `ganancia_empresa` decimal(10,2) DEFAULT NULL,
  `porcentaje_repartidor` int(11) DEFAULT NULL,
  `porcentaje_empresa` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `descarga`
--

INSERT INTO `descarga` (`id`, `repartidor_id`, `carga_id`, `productos_devueltos`, `productos_vendidos`, `envases_recuperados`, `deficit_envases`, `monto_total`, `observaciones`, `fecha_descarga`, `estado_cuenta`, `ganancia_repartidor`, `ganancia_empresa`, `porcentaje_repartidor`, `porcentaje_empresa`) VALUES
(4, 2, 4, '0', 70, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-10 21:14:35', 'pendiente', NULL, NULL, NULL, NULL),
(5, 2, 10, '0', 5, 0, 0, '0.00', 'Descarga de productos de Repartidor', '2025-03-10 23:04:24', 'pendiente', NULL, NULL, NULL, NULL),
(6, 4, 9, '0', 1, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-10 23:08:12', 'pendiente', NULL, NULL, NULL, NULL),
(7, 2, 8, '0', 64, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-10 23:25:42', 'pendiente', NULL, NULL, NULL, NULL),
(8, 2, 7, '0', 1, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-11 03:39:56', 'pendiente', NULL, NULL, NULL, NULL),
(9, 4, 6, '0', 14, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 03:43:37', 'pendiente', NULL, NULL, NULL, NULL),
(10, 2, 12, '0', 121, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-11 04:40:56', 'pendiente', NULL, NULL, NULL, NULL),
(11, 2, 5, '0', 40, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-11 04:41:21', 'pendiente', NULL, NULL, NULL, NULL),
(12, 4, 14, '0', 114, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 04:47:04', 'pendiente', NULL, NULL, NULL, NULL),
(13, 4, 13, '0', 112, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 04:50:35', 'pendiente', NULL, NULL, NULL, NULL),
(14, 4, 15, '0', 4, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 04:51:41', 'pendiente', NULL, NULL, NULL, NULL),
(15, 4, 16, '0', 0, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 04:52:50', 'pendiente', NULL, NULL, NULL, NULL),
(16, 4, 17, '0', 6, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 04:53:23', 'pendiente', NULL, NULL, NULL, NULL),
(17, 4, 18, '0', 10, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 04:56:37', 'pendiente', NULL, NULL, NULL, NULL),
(18, 3, 11, '0', 0, 0, 0, '0.00', 'Descarga de productos de Axel Torres ', '2025-03-11 05:08:11', 'pendiente', NULL, NULL, NULL, NULL),
(19, 4, 19, '[{\"producto_id\":1,\"cantidad\":8},{\"producto_id\":2,\"cantidad\":3},{\"producto_id\":3,\"cantidad\":84}]', 16, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 05:12:44', 'pendiente', NULL, NULL, NULL, NULL),
(20, 3, 20, '[{\"producto_id\":1,\"cantidad\":5},{\"producto_id\":3,\"cantidad\":26}]', 58, 0, 0, '107600.00', 'Descarga de productos de Axel Torres ', '2025-03-11 17:39:16', 'finalizado', '21520.00', '86080.00', 20, 80),
(21, 4, 21, '[{\"producto_id\":1,\"cantidad\":4},{\"producto_id\":3,\"cantidad\":12}]', 134, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-11 18:33:33', 'pendiente', NULL, NULL, NULL, NULL),
(22, 3, 23, '[{\"producto_id\":1,\"cantidad\":4},{\"producto_id\":2,\"cantidad\":2},{\"producto_id\":3,\"cantidad\":12}]', 67, 0, 0, '0.00', 'Descarga de productos de Axel Torres ', '2025-03-11 21:53:03', 'pendiente', NULL, NULL, NULL, NULL),
(23, 2, 24, '[{\"producto_id\":1,\"cantidad\":4},{\"producto_id\":2,\"cantidad\":3}]', 16, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-13 22:27:23', 'pendiente', NULL, NULL, NULL, NULL),
(24, 4, 22, '[{\"producto_id\":1,\"cantidad\":10}]', 50, 0, 0, '0.00', 'Descarga de productos de David Schenatti', '2025-03-16 16:05:31', 'pendiente', NULL, NULL, NULL, NULL),
(25, 2, 25, '[{\"producto_id\":1,\"cantidad\":2},{\"producto_id\":2,\"cantidad\":1},{\"producto_id\":3,\"cantidad\":42},{\"producto_id\":4,\"cantidad\":18}]', 102, 0, 0, '0.00', 'Descarga de productos de Gustavo Careaga', '2025-03-16 16:38:43', 'pendiente', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `descarga_envases`
--

CREATE TABLE `descarga_envases` (
  `id` int(11) NOT NULL,
  `descarga_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `envases_recuperados` int(11) NOT NULL,
  `deficit_envases` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `descarga_envases`
--

INSERT INTO `descarga_envases` (`id`, `descarga_id`, `producto_id`, `envases_recuperados`, `deficit_envases`) VALUES
(1, 4, 1, 35, 10),
(2, 5, 1, 4, 1),
(3, 6, 1, 1, 4),
(4, 7, 1, 12, 10),
(5, 9, 1, 5, 10),
(6, 10, 1, 7, 15),
(7, 11, 1, 8, 40),
(8, 14, 1, 1, 8),
(9, 17, 1, 2, 2),
(10, 19, 3, 6, 84),
(11, 20, 1, 10, 5),
(12, 20, 3, 30, 26),
(13, 21, 1, 16, 4),
(14, 21, 2, 10, 0),
(15, 21, 3, 108, 12),
(16, 22, 1, 10, 4),
(17, 22, 2, 2, 2),
(18, 22, 3, 44, 12),
(19, 23, 1, 16, 4),
(20, 25, 1, 10, 2),
(21, 25, 2, 4, 1),
(22, 25, 3, 48, 42),
(23, 25, 4, 48, 18);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `envases_prestados`
--

CREATE TABLE `envases_prestados` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `tipo_producto` enum('AGUA','SODA') NOT NULL,
  `capacidad` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 0,
  `fecha_prestamo` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `envases_prestados`
--

INSERT INTO `envases_prestados` (`id`, `cliente_id`, `tipo_producto`, `capacidad`, `cantidad`, `fecha_prestamo`) VALUES
(1, 9, 'AGUA', 0, 4, '2025-03-21 02:07:58'),
(2, 9, 'AGUA', 0, 6, '2025-03-21 02:07:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `nombreProducto` varchar(255) NOT NULL,
  `precioPublico` decimal(10,2) DEFAULT NULL,
  `precioRevendedor` decimal(10,2) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `cantidadStock` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombreProducto`, `precioPublico`, `precioRevendedor`, `descripcion`, `cantidadStock`) VALUES
(1, 'Bidón x 20L', '3400.00', '1700.00', NULL, NULL),
(2, 'Bidón x 12L', '2700.00', '1400.00', NULL, NULL),
(3, 'Soda Sifon x 1500', '950.00', '0.00', NULL, NULL),
(4, 'Soda Sifon x 1250', '900.00', '583.00', NULL, NULL),
(5, 'Soda Sifon x 1000', '800.00', '0.00', NULL, NULL),
(6, 'Dispenser Frio Calor', '290000.00', '290000.00', 'Dispenser Paris Frio Calor', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `repartidores`
--

CREATE TABLE `repartidores` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `zona_reparto` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `repartidores`
--

INSERT INTO `repartidores` (`id`, `nombre`, `telefono`, `zona_reparto`, `activo`, `fecha_registro`) VALUES
(2, 'Gustavo Careaga', '3585764416', 'DEFAULT', 1, '2025-01-23 22:38:27'),
(3, 'Axel Torres ', '3586022828', 'Alberdi / Abilene', 1, '2025-01-23 23:05:56'),
(4, 'David Schenatti', '3585177219', 'DEFAULT', 1, '2025-01-23 23:06:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `nivel_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id`, `email`, `password`, `created_at`, `nivel_usuario`) VALUES
(1, 'admin@prueba.com', '$2b$10$RwOEFvnLFgd3r6A2NQI4FeARtz9dzHx10vku8p9gq/oNtalT01YSG', '2025-01-18 20:43:34', 0),
(3, 'venta@soderiadonjavier.com', '$2b$10$wgBuhC2KiWn6WRPKwohqkOwP7Uw3Sj7hCWKejMJ5YHEcs9sh.3/Oe', '2025-02-11 14:46:11', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta`
--

CREATE TABLE `venta` (
  `venta_id` varchar(36) NOT NULL,
  `revendedor_nombre` varchar(255) DEFAULT NULL,
  `repartidor_id` varchar(255) DEFAULT NULL,
  `productos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `monto_total` varchar(255) NOT NULL,
  `medio_pago` enum('efectivo','transferencia') NOT NULL,
  `forma_pago` enum('total','parcial') NOT NULL,
  `saldo` tinyint(1) NOT NULL,
  `saldo_monto` varchar(255) DEFAULT NULL,
  `fecha_venta` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ;

--
-- Volcado de datos para la tabla `venta`
--

INSERT INTO `venta` (`venta_id`, `revendedor_nombre`, `repartidor_id`, `productos`, `monto_total`, `medio_pago`, `forma_pago`, `saldo`, `saldo_monto`, `fecha_venta`) VALUES
('8abe9709-7d2e-44f0-8f17-fa99baed0fdd', 'Rafael Leyria', '', '[{\"producto_id\":\"prod-1\",\"cantidad\":10,\"precio_unitario\":\"1700.00\",\"subtotal\":\"17000.00\"},{\"producto_id\":\"prod-2\",\"cantidad\":2,\"precio_unitario\":\"1400.00\",\"subtotal\":\"2800.00\"},{\"producto_id\":\"prod-4\",\"cantidad\":120,\"precio_unitario\":\"583.00\",\"subtotal\":\"69960.00\"}]', '89760.00', 'efectivo', 'total', 0, NULL, '2025-03-10 13:17:43.167110'),
('dc1fbbe6-8f2a-4542-9445-a6208d2eeb2a', 'Daniel Sargiotto', '', '[{\"producto_id\":\"prod-1\",\"cantidad\":20,\"precio_unitario\":\"1700.00\",\"subtotal\":\"34000.00\"},{\"producto_id\":\"prod-2\",\"cantidad\":10,\"precio_unitario\":\"1400.00\",\"subtotal\":\"14000.00\"},{\"producto_id\":\"prod-4\",\"cantidad\":123,\"precio_unitario\":\"583.00\",\"subtotal\":\"71709.00\"}]', '119709.00', 'efectivo', 'total', 0, NULL, '2025-02-11 16:25:18.544310');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cargas`
--
ALTER TABLE `cargas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_repartidor_carga` (`repartidor_id`);

--
-- Indices de la tabla `carga_items`
--
ALTER TABLE `carga_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `carga_id` (`carga_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `descarga`
--
ALTER TABLE `descarga`
  ADD PRIMARY KEY (`id`),
  ADD KEY `carga_id` (`carga_id`),
  ADD KEY `descarga_repartidor_fk` (`repartidor_id`);

--
-- Indices de la tabla `descarga_envases`
--
ALTER TABLE `descarga_envases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `descarga_id` (`descarga_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `envases_prestados`
--
ALTER TABLE `envases_prestados`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cliente_id` (`cliente_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `repartidores`
--
ALTER TABLE `repartidores`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `venta`
--
ALTER TABLE `venta`
  ADD PRIMARY KEY (`venta_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cargas`
--
ALTER TABLE `cargas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `carga_items`
--
ALTER TABLE `carga_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `descarga`
--
ALTER TABLE `descarga`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `descarga_envases`
--
ALTER TABLE `descarga_envases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de la tabla `envases_prestados`
--
ALTER TABLE `envases_prestados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `repartidores`
--
ALTER TABLE `repartidores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT de la tabla `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cargas`
--
ALTER TABLE `cargas`
  ADD CONSTRAINT `FK_repartidor_carga` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`);

--
-- Filtros para la tabla `carga_items`
--
ALTER TABLE `carga_items`
  ADD CONSTRAINT `carga_items_ibfk_1` FOREIGN KEY (`carga_id`) REFERENCES `cargas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `carga_items_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `descarga`
--
ALTER TABLE `descarga`
  ADD CONSTRAINT `descarga_ibfk_2` FOREIGN KEY (`carga_id`) REFERENCES `cargas` (`id`),
  ADD CONSTRAINT `descarga_repartidor_fk` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`);

--
-- Filtros para la tabla `descarga_envases`
--
ALTER TABLE `descarga_envases`
  ADD CONSTRAINT `descarga_envases_ibfk_1` FOREIGN KEY (`descarga_id`) REFERENCES `descarga` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `descarga_envases_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `envases_prestados`
--
ALTER TABLE `envases_prestados`
  ADD CONSTRAINT `envases_prestados_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
