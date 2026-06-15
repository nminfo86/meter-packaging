-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : lun. 15 juin 2026 à 07:02
-- Version du serveur : 8.0.31
-- Version de PHP : 8.1.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `meter-packaging`
--

-- --------------------------------------------------------

--
-- Structure de la table `box`
--

DROP TABLE IF EXISTS `box`;
CREATE TABLE IF NOT EXISTS `box` (
  `id` int NOT NULL AUTO_INCREMENT,
  `box_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` varchar(10) NOT NULL,
  `id_palette` int DEFAULT NULL,
  `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_palette` (`id_palette`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `meter`
--

DROP TABLE IF EXISTS `meter`;
CREATE TABLE IF NOT EXISTS `meter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barcode` varchar(12) NOT NULL,
  `id_meter_type` int NOT NULL,
  `id_box` int DEFAULT NULL,
  `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_meter_type` (`id_meter_type`),
  KEY `id_box` (`id_box`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
 --------------------------------------------------------

--
-- Structure de la table `meter_type`
--

DROP TABLE IF EXISTS `meter_type`;
CREATE TABLE IF NOT EXISTS `meter_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meter_type` varchar(100) NOT NULL DEFAULT '',
  `qty_box` int NOT NULL,
  `qty_box_palette` int NOT NULL,
  `homologation` varchar(250) NOT NULL,
  `contrat` varchar(250) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `meter_type`
--

INSERT INTO `meter_type` (`id`, `meter_type`, `qty_box`, `qty_box_palette`, `homologation`, `contrat`) VALUES
(1, 'SGM12-DL', 4, 6, 'Homologation ONML N° 125/ONML/2026', 'Contrat N° 01/SAIEG-SD/2026'),
(2, 'Triphase', 5, 4, 'Homologation ONML N° 125/ONML/2026', 'Contrat N° 01/SAIEG-SD/2026');

-- --------------------------------------------------------

--
-- Structure de la table `palette`
--

DROP TABLE IF EXISTS `palette`;
CREATE TABLE IF NOT EXISTS `palette` (
  `id` int NOT NULL AUTO_INCREMENT,
  `palette_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` varchar(10) NOT NULL,
  `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `box`
--
ALTER TABLE `box`
  ADD CONSTRAINT `box_ibfk_1` FOREIGN KEY (`id_palette`) REFERENCES `palette` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `meter`
--
ALTER TABLE `meter`
  ADD CONSTRAINT `meter_ibfk_1` FOREIGN KEY (`id_meter_type`) REFERENCES `meter_type` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `meter_ibfk_2` FOREIGN KEY (`id_box`) REFERENCES `box` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
