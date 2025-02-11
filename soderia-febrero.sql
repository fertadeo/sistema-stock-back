-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 11-02-2025 a las 21:39:56
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
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fecha_carga` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('pendiente','completada','cancelada') NOT NULL DEFAULT 'pendiente'
) ;

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
  `estado` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `dni`, `nombre`, `email`, `telefono`, `direccion`, `zona`, `fecha_alta`, `estado`) VALUES
(6, NULL, 'sandra', NULL, '3584820675', NULL, 'Las Quintas', '2025-02-10 20:27:27', 1),
(7, NULL, 'Fernando Tadeo', 'fernandotadeos@gmail.com', '03541222719', 'Av. Colón 1494', 'Banda Norte', '2025-02-11 17:14:41', 1);

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
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
