-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-10-2024 a las 01:05:16
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `cortinova`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `dni` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `telefono` varchar(255) NOT NULL,
  `direccion` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `dni`, `nombre`, `email`, `telefono`, `direccion`) VALUES
(1, '35502665', 'Fernando Tadeo', 'fernandotadeos@gmail.com', '3541222719', 'colon 1233');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

CREATE TABLE `pedido` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `fecha_pedido` datetime NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `clienteId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
--

CREATE TABLE `producto` (
  `id` int(11) NOT NULL,
  `nombreProducto` varchar(255) NOT NULL,
  `cantidad_stock` varchar(255) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `precioCosto` varchar(255) NOT NULL,
  `precio` int(11) NOT NULL,
  `divisa` varchar(255) NOT NULL,
  `descuento` int(11) NOT NULL,
  `rubro_id` varchar(255) NOT NULL,
  `sistema_id` varchar(255) NOT NULL,
  `disponible` tinyint(4) NOT NULL,
  `proveedor_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `producto`
--

INSERT INTO `producto` (`id`, `nombreProducto`, `cantidad_stock`, `descripcion`, `precioCosto`, `precio`, `divisa`, `descuento`, `rubro_id`, `sistema_id`, `disponible`, `proveedor_id`) VALUES
(1, 'CONFECCION TABLEADO', '10', 'sin descripcion', '0', 25000, '', 0, '1', '1', 1, 1),
(2, 'CONFECCION TABLEADO CON ARGOLLAS', '10', 'sin descripcion', '0', 30000, '', 0, '1', '1', 0, 1),
(3, 'CONF. TABLEADO C/RIEL', '10', 'sin descripcion', '0', 51800, '', 0, '1', '1', 0, 1),
(4, 'COLOCACIÓN DE RIEL', '10', 'sin descripcion', '0', 7000, '', 0, '2', '1', 0, 1),
(5, 'VIATICO', '10', 'sin descripcion', '0', 26000, '', 0, '3', '1', 0, 1),
(6, 'ARREGLO POR CORTINA', '10', 'sin descripcion', '0', 27000, '', 0, '3', '1', 0, 1),
(7, 'ALFOMBRA 0,60 X 0,90', '10', 'sin descripcion', '0', 23000, '', 0, '4', '1', 0, 1),
(8, 'ALFOMBRA 1,20 X 1,50', '10', 'sin descripcion', '0', 110000, '', 0, '4', '1', 0, 1),
(9, 'ALFOMBRA 1,50 X 1,50 LISA - RAYADA', '10', 'sin descripcion', '0', 138000, '', 0, '4', '1', 0, 1),
(10, 'ALFOMBRA 1,50 X 1,50 ROMBO', '10', 'sin descripcion', '0', 138000, '', 0, '4', '1', 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL,
  `nombreProveedores` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id`, `nombreProveedores`) VALUES
(1, 'PROPIO'),
(2, 'FREIRE'),
(3, 'CORBEIL'),
(4, 'BLACK OUT'),
(5, 'ABEA y otros'),
(6, 'SHEFA'),
(7, 'FLEX COLOR'),
(8, 'PROPIO'),
(9, 'FREIRE'),
(10, 'CORBEIL'),
(11, 'BLACK OUT'),
(12, 'ABEA y otros'),
(13, 'SHEFA'),
(14, 'FLEX COLOR'),
(15, 'ONETTO Y BIANCHI');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rubros`
--

CREATE TABLE `rubros` (
  `id` int(11) NOT NULL,
  `nombreRubros` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rubros`
--

INSERT INTO `rubros` (`id`, `nombreRubros`) VALUES
(3, 'ARREGLOS FLEX'),
(2, 'COLOCACIONES -'),
(1, 'CONFECCIONES'),
(4, 'SIN RUBRO');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sistemas`
--

CREATE TABLE `sistemas` (
  `id` int(11) NOT NULL,
  `nombreSistemas` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sistemas`
--

INSERT INTO `sistemas` (`id`, `nombreSistemas`) VALUES
(3, 'ACCESORIOS -ROLLER'),
(6, 'BANDA VERTICAL - BARCELONA'),
(10, 'BARRALES 16 mm'),
(11, 'BARRALES 22mm'),
(12, 'BARRALES 25mm'),
(7, 'LINEA DUBAI'),
(8, 'LINEA DUNES'),
(9, 'RIELES'),
(2, 'ROLLER'),
(1, 'SIN SISTEMA'),
(4, 'SISTEMA FIT'),
(5, 'VENECIANA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `nivel_usuario` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id`, `email`, `password`, `created_at`, `nivel_usuario`) VALUES
(4, 'ftadeo@cortinova.com', '$2b$10$BTrHgleu70kXFjhMr6BU9Oh3G4Ku69Z.uJQsuiquJOm235e/gpnr2', '2024-10-21 16:27:19.620974', 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_2730a0c3947641edf256551f10c` (`clienteId`);

--
-- Indices de la tabla `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_4574456dcef5b1c686b93fb982a` (`proveedor_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rubros`
--
ALTER TABLE `rubros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombreRubros` (`nombreRubros`);

--
-- Indices de la tabla `sistemas`
--
ALTER TABLE `sistemas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombreSistemas` (`nombreSistemas`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `producto`
--
ALTER TABLE `producto`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `rubros`
--
ALTER TABLE `rubros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `sistemas`
--
ALTER TABLE `sistemas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `FK_2730a0c3947641edf256551f10c` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `producto`
--
ALTER TABLE `producto`
  ADD CONSTRAINT `FK_4574456dcef5b1c686b93fb982a` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
