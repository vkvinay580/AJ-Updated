-- Public demo database snapshot.
-- Authentication sessions and device tokens are omitted; stored passwords are disabled.

/*M!999999\- enable the sandbox mode */

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `accounts_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_session_token` (`token_hash`),
  KEY `idx_accounts_sessions_expiry` (`expires_at`),
  KEY `fk_accounts_session_user` (`user_id`),
  CONSTRAINT `fk_accounts_session_user` FOREIGN KEY (`user_id`) REFERENCES `accounts_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `accounts_sessions` WRITE;
/*!40000 ALTER TABLE `accounts_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts_sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `accounts_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts_users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `name` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `accounts_users` WRITE;
/*!40000 ALTER TABLE `accounts_users` DISABLE KEYS */;
INSERT INTO `accounts_users` VALUES
(1,'accounts','Accounts Executive','!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',1,'2026-10-14 11:31:33','2026-10-19 09:43:25');
/*!40000 ALTER TABLE `accounts_users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `admin_company_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_company_access` (
  `admin_id` int(10) unsigned NOT NULL,
  `company_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`admin_id`,`company_id`),
  KEY `fk_access_company` (`company_id`),
  CONSTRAINT `fk_access_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `admin_company_access` WRITE;
/*!40000 ALTER TABLE `admin_company_access` DISABLE KEYS */;
INSERT INTO `admin_company_access` VALUES
(1,1),
(1,2),
(1,3);
/*!40000 ALTER TABLE `admin_company_access` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `name` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES
(1,'admin@aryangold.in','Aryan Gold Administrator','!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',1,'2026-08-26 09:40:04','2026-10-19 09:43:25'),
(2,'floor-user@internal.aryangold','Floor Operations User','!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',0,'2026-10-14 11:31:32','2026-10-19 09:43:25');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int(10) unsigned DEFAULT NULL,
  `company_id` int(10) unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_company_date` (`company_id`,`created_at`),
  KEY `fk_audit_admin` (`admin_id`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=438 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES
(1,1,1,'login',NULL,NULL,'148.66.153.7','2026-08-26 09:40:49'),
(2,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-26 09:41:15'),
(3,1,1,'logout',NULL,NULL,NULL,'2026-08-26 09:41:26'),
(4,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-26 09:41:35'),
(5,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-26 09:44:01'),
(6,1,1,'login',NULL,NULL,'148.66.153.7','2026-08-26 09:49:27'),
(7,1,1,'report_xlsx_downloaded','report',NULL,'148.66.153.7','2026-08-26 09:49:28'),
(8,1,1,'report_pdf_downloaded','report',NULL,'148.66.153.7','2026-08-26 09:49:28'),
(9,1,2,'logout',NULL,NULL,NULL,'2026-08-26 09:57:51'),
(10,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-26 09:57:54'),
(11,1,2,'logout',NULL,NULL,NULL,'2026-08-26 09:57:57'),
(12,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-26 09:58:00'),
(13,1,3,'logout',NULL,NULL,NULL,'2026-08-26 09:58:04'),
(14,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-26 10:14:06'),
(15,1,3,'logout',NULL,NULL,NULL,'2026-08-26 10:14:19'),
(16,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-26 10:16:55'),
(17,1,3,'logout',NULL,NULL,NULL,'2026-08-26 10:17:58'),
(18,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-26 10:18:50'),
(19,1,3,'logout',NULL,NULL,NULL,'2026-08-26 10:20:57'),
(20,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-26 10:21:06'),
(21,1,1,'logout',NULL,NULL,NULL,'2026-08-26 10:21:09'),
(22,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-26 10:21:12'),
(23,1,1,'customer_created','customer',1,'103.139.158.138','2026-08-26 10:23:54'),
(24,1,1,'bill_created','bill',1,'103.139.158.138','2026-08-26 10:24:20'),
(25,1,1,'logout',NULL,NULL,NULL,'2026-08-26 10:25:15'),
(26,1,1,'login',NULL,NULL,'148.66.153.7','2026-08-26 10:27:19'),
(27,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-26 10:31:53'),
(28,1,1,'bill_created','bill',2,'103.139.158.138','2026-08-26 10:32:36'),
(29,1,1,'login',NULL,NULL,'148.66.153.7','2026-08-26 10:58:47'),
(30,1,2,'login',NULL,NULL,'148.66.153.7','2026-08-26 10:58:47'),
(31,1,3,'login',NULL,NULL,'148.66.153.7','2026-08-26 10:58:47'),
(32,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-26 11:00:09'),
(33,1,1,'bill_deleted','bill',2,'103.139.158.138','2026-08-26 11:00:28'),
(34,1,1,'bill_deleted','bill',1,'103.139.158.138','2026-08-26 11:00:31'),
(35,1,1,'customer_deleted','customer',1,'103.139.158.138','2026-08-26 11:00:38'),
(36,1,1,'login',NULL,NULL,'122.183.54.212','2026-08-26 13:27:11'),
(37,1,1,'login',NULL,NULL,'122.183.54.212','2026-08-26 13:29:07'),
(38,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-27 05:04:33'),
(39,1,2,'customer_created','customer',2,'103.139.158.138','2026-08-27 05:05:27'),
(40,1,2,'bill_created','bill',3,'103.139.158.138','2026-08-27 05:06:27'),
(41,1,2,'bill_deleted','bill',3,'103.139.158.138','2026-08-27 05:06:53'),
(42,1,2,'customer_deleted','customer',2,'103.139.158.138','2026-08-27 05:06:58'),
(43,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-27 07:01:39'),
(44,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-27 12:22:16'),
(45,1,2,'logout',NULL,NULL,NULL,'2026-08-27 12:22:50'),
(46,1,1,'login',NULL,NULL,'223.181.107.32','2026-08-28 05:56:42'),
(47,1,1,'customer_created','customer',3,'223.181.107.32','2026-08-28 06:04:05'),
(48,1,1,'bill_created','bill',4,'223.181.107.32','2026-08-28 06:09:48'),
(49,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 06:10:18'),
(50,1,1,'login',NULL,NULL,'223.181.107.32','2026-08-28 06:19:21'),
(51,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 06:41:02'),
(52,1,1,'login',NULL,NULL,'223.181.107.32','2026-08-28 07:02:22'),
(53,1,1,'customer_created','customer',4,'223.181.107.32','2026-08-28 07:06:57'),
(54,1,1,'bill_created','bill',5,'223.181.107.32','2026-08-28 07:08:25'),
(55,1,3,'login',NULL,NULL,'223.181.107.32','2026-08-28 07:12:14'),
(56,1,3,'customer_created','customer',5,'223.181.107.32','2026-08-28 07:16:10'),
(57,1,3,'bill_created','bill',6,'223.181.107.32','2026-08-28 07:17:13'),
(58,1,2,'login',NULL,NULL,'223.181.107.32','2026-08-28 07:19:41'),
(59,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 07:21:23'),
(60,1,2,'customer_created','customer',6,'223.181.107.32','2026-08-28 07:21:51'),
(61,1,2,'bill_created','bill',7,'223.181.107.32','2026-08-28 07:22:52'),
(62,1,1,'customer_created','customer',7,'103.139.158.138','2026-08-28 07:22:52'),
(63,1,1,'bill_created','bill',8,'103.139.158.138','2026-08-28 07:23:40'),
(64,1,1,'logout',NULL,NULL,NULL,'2026-08-28 07:24:49'),
(65,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 07:25:19'),
(66,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 07:28:10'),
(67,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 07:28:36'),
(68,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 07:31:22'),
(69,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 07:31:55'),
(70,1,1,'bill_deleted','bill',8,'103.139.158.138','2026-08-28 07:32:19'),
(71,1,1,'customer_deleted','customer',7,'103.139.158.138','2026-08-28 07:32:48'),
(72,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 07:49:17'),
(73,1,1,'customer_created','customer',8,'103.139.158.138','2026-08-28 07:55:35'),
(74,1,1,'bill_created','bill',9,'103.139.158.138','2026-08-28 07:56:08'),
(75,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 08:00:04'),
(76,1,1,'bill_deleted','bill',9,'103.139.158.138','2026-08-28 08:00:49'),
(77,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 08:05:08'),
(78,1,1,'bill_created','bill',10,'223.231.140.47','2026-08-28 08:06:35'),
(79,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 08:27:36'),
(80,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 08:36:59'),
(81,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 09:08:15'),
(82,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 09:14:16'),
(83,1,1,'bill_created','bill',11,'223.231.140.47','2026-08-28 09:35:59'),
(84,1,1,'logout',NULL,NULL,NULL,'2026-08-28 09:37:31'),
(85,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 09:38:26'),
(86,1,1,'report_pdf_downloaded','report',NULL,'223.231.140.47','2026-08-28 09:40:34'),
(87,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 10:13:03'),
(88,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 10:15:47'),
(89,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 10:20:06'),
(90,1,1,'login',NULL,NULL,'223.231.140.47','2026-08-28 10:33:13'),
(91,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-28 11:04:31'),
(92,1,1,'bill_deleted','bill',11,'103.139.158.138','2026-08-28 11:04:37'),
(93,1,1,'bill_deleted','bill',10,'103.139.158.138','2026-08-28 11:04:40'),
(94,1,1,'customer_deleted','customer',8,'103.139.158.138','2026-08-28 11:04:50'),
(95,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-29 05:24:13'),
(96,1,2,'logout',NULL,NULL,NULL,'2026-08-29 05:24:22'),
(97,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-29 05:24:24'),
(98,1,1,'logout',NULL,NULL,NULL,'2026-08-29 05:24:26'),
(99,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-29 05:24:29'),
(100,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-29 12:17:59'),
(101,1,1,'logout',NULL,NULL,NULL,'2026-08-29 12:18:05'),
(102,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-29 12:18:07'),
(103,1,2,'logout',NULL,NULL,NULL,'2026-08-29 12:18:09'),
(104,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-29 12:18:11'),
(105,1,3,'logout',NULL,NULL,NULL,'2026-08-29 12:18:14'),
(106,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-31 07:57:48'),
(107,1,2,'logout',NULL,NULL,NULL,'2026-08-31 07:57:56'),
(108,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-31 07:57:58'),
(109,1,1,'logout',NULL,NULL,NULL,'2026-08-31 07:58:06'),
(110,1,3,'login',NULL,NULL,'103.139.158.138','2026-08-31 07:58:08'),
(111,1,3,'logout',NULL,NULL,NULL,'2026-08-31 08:00:21'),
(112,1,2,'login',NULL,NULL,'103.139.158.138','2026-08-31 08:00:23'),
(113,1,2,'logout',NULL,NULL,NULL,'2026-08-31 08:00:36'),
(114,1,1,'login',NULL,NULL,'103.139.158.138','2026-08-31 08:00:38'),
(115,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-01 03:37:53'),
(116,1,1,'logout',NULL,NULL,NULL,'2026-09-01 04:13:32'),
(117,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-01 04:13:34'),
(118,1,2,'logout',NULL,NULL,NULL,'2026-09-01 04:13:37'),
(119,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-01 04:13:39'),
(120,1,3,'logout',NULL,NULL,NULL,'2026-09-01 04:13:42'),
(121,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-01 06:24:17'),
(122,1,2,'logout',NULL,NULL,NULL,'2026-09-01 06:24:20'),
(123,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-01 06:24:21'),
(124,1,1,'logout',NULL,NULL,NULL,'2026-09-01 06:24:38'),
(125,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-01 06:24:42'),
(126,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-01 11:38:45'),
(127,1,2,'logout',NULL,NULL,NULL,'2026-09-01 11:38:50'),
(128,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-01 11:38:52'),
(129,1,1,'logout',NULL,NULL,NULL,'2026-09-01 11:38:54'),
(130,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-01 11:38:57'),
(131,1,3,'logout',NULL,NULL,NULL,'2026-09-01 11:39:00'),
(132,1,2,'login',NULL,NULL,'223.181.106.211','2026-09-01 11:45:35'),
(133,1,2,'customer_created','customer',9,'223.181.106.211','2026-09-01 11:49:14'),
(134,1,2,'bill_created','bill',12,'223.181.106.211','2026-09-01 11:50:01'),
(135,1,2,'login',NULL,NULL,'223.181.106.211','2026-09-01 12:00:44'),
(136,1,1,'login',NULL,NULL,'223.181.106.211','2026-09-01 12:05:42'),
(137,1,1,'bill_created','bill',13,'223.181.106.211','2026-09-01 12:09:02'),
(138,1,1,'login',NULL,NULL,'223.181.106.211','2026-09-01 12:24:12'),
(139,1,1,'login',NULL,NULL,'223.181.106.211','2026-09-01 15:39:54'),
(140,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-03 04:05:15'),
(141,1,2,'customer_created','customer',10,'103.139.158.138','2026-09-03 04:11:59'),
(142,1,2,'bill_created','bill',14,'103.139.158.138','2026-09-03 04:13:17'),
(143,1,2,'bill_deleted','bill',14,'103.139.158.138','2026-09-03 04:14:20'),
(144,1,2,'bill_created','bill',15,'103.139.158.138','2026-09-03 04:53:45'),
(145,1,2,'bill_deleted','bill',15,'103.139.158.138','2026-09-03 05:35:12'),
(146,1,2,'customer_deleted','customer',10,'103.139.158.138','2026-09-03 08:25:22'),
(147,1,1,'login',NULL,NULL,'223.185.135.9','2026-09-03 09:56:59'),
(148,1,1,'customer_created','customer',11,'223.185.135.9','2026-09-03 10:00:27'),
(149,1,1,'bill_created','bill',16,'223.185.135.9','2026-09-03 10:03:42'),
(150,1,1,'login',NULL,NULL,'223.185.135.9','2026-09-03 10:13:28'),
(151,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-03 10:22:05'),
(152,1,1,'login',NULL,NULL,'223.185.135.9','2026-09-04 11:11:30'),
(153,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-04 11:11:54'),
(154,1,1,'customer_created','customer',12,'103.139.158.138','2026-09-04 11:13:01'),
(155,1,1,'bill_created','bill',17,'103.139.158.138','2026-09-04 11:14:44'),
(156,1,1,'bill_deleted','bill',17,'103.139.158.138','2026-09-04 11:15:53'),
(157,1,1,'customer_deleted','customer',12,'103.139.158.138','2026-09-04 11:16:01'),
(158,1,1,'login',NULL,NULL,'223.185.135.9','2026-09-04 11:25:17'),
(159,1,1,'bill_created','bill',18,'223.185.135.9','2026-09-04 11:28:09'),
(160,1,1,'login',NULL,NULL,'223.185.135.9','2026-09-04 11:35:11'),
(161,1,1,'customer_created','customer',13,'223.185.135.9','2026-09-04 11:41:13'),
(162,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-05 06:29:38'),
(163,1,1,'logout',NULL,NULL,NULL,'2026-09-05 06:29:48'),
(164,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-05 06:29:50'),
(165,1,2,'logout',NULL,NULL,NULL,'2026-09-05 06:29:53'),
(166,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-05 06:29:55'),
(167,1,3,'logout',NULL,NULL,NULL,'2026-09-05 06:29:57'),
(168,1,1,'login',NULL,NULL,'27.61.44.90','2026-09-05 06:35:10'),
(169,1,1,'login',NULL,NULL,'27.61.44.90','2026-09-05 06:52:56'),
(170,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-05 06:53:09'),
(171,1,1,'login',NULL,NULL,'27.61.44.90','2026-09-05 07:03:13'),
(172,1,1,'customer_created','customer',14,'27.61.44.90','2026-09-05 07:05:15'),
(173,1,1,'bill_created','bill',19,'27.61.44.90','2026-09-05 07:06:03'),
(174,1,1,'bill_deleted','bill',19,'27.61.44.90','2026-09-05 07:07:07'),
(175,1,1,'customer_deleted','customer',14,'27.61.44.90','2026-09-05 07:07:30'),
(176,1,1,'logout',NULL,NULL,NULL,'2026-09-05 07:11:41'),
(177,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-05 07:11:44'),
(178,1,1,'logout',NULL,NULL,NULL,'2026-09-05 09:04:13'),
(179,1,1,'login',NULL,NULL,'27.61.41.90','2026-09-05 09:04:44'),
(180,1,1,'logout',NULL,NULL,NULL,'2026-09-05 09:15:00'),
(181,1,1,'login',NULL,NULL,'27.61.41.90','2026-09-05 09:26:32'),
(182,1,1,'logout',NULL,NULL,NULL,'2026-09-05 09:26:39'),
(183,1,1,'login',NULL,NULL,'27.61.41.90','2026-09-05 09:26:52'),
(184,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-05 10:00:06'),
(185,1,1,'logout',NULL,NULL,NULL,'2026-09-05 10:00:18'),
(186,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-05 10:10:01'),
(187,1,1,'logout',NULL,NULL,NULL,'2026-09-05 10:25:11'),
(188,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-05 10:25:13'),
(189,1,2,'logout',NULL,NULL,NULL,'2026-09-05 10:25:15'),
(190,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-05 10:25:17'),
(191,1,2,'logout',NULL,NULL,NULL,'2026-09-05 10:25:22'),
(192,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-05 10:25:24'),
(193,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:04:34'),
(194,1,1,'bill_deleted','bill',18,'223.185.129.212','2026-09-07 07:04:55'),
(195,1,1,'bill_deleted','bill',16,'223.185.129.212','2026-09-07 07:04:57'),
(196,1,1,'bill_deleted','bill',13,'223.185.129.212','2026-09-07 07:04:59'),
(197,1,1,'bill_deleted','bill',5,'223.185.129.212','2026-09-07 07:05:01'),
(198,1,1,'bill_deleted','bill',4,'223.185.129.212','2026-09-07 07:05:03'),
(199,1,1,'customer_deleted','customer',13,'223.185.129.212','2026-09-07 07:05:37'),
(200,1,1,'customer_deleted','customer',11,'223.185.129.212','2026-09-07 07:05:39'),
(201,1,1,'customer_deleted','customer',4,'223.185.129.212','2026-09-07 07:05:42'),
(202,1,1,'customer_deleted','customer',3,'223.185.129.212','2026-09-07 07:05:44'),
(203,1,1,'logout',NULL,NULL,NULL,'2026-09-07 07:05:58'),
(204,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:06:03'),
(205,1,2,'bill_deleted','bill',12,'223.185.129.212','2026-09-07 07:06:12'),
(206,1,2,'bill_deleted','bill',7,'223.185.129.212','2026-09-07 07:06:14'),
(207,1,2,'customer_deleted','customer',9,'223.185.129.212','2026-09-07 07:06:22'),
(208,1,2,'customer_deleted','customer',6,'223.185.129.212','2026-09-07 07:06:24'),
(209,1,2,'logout',NULL,NULL,NULL,'2026-09-07 07:06:31'),
(210,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:06:36'),
(211,1,3,'bill_deleted','bill',6,'223.185.129.212','2026-09-07 07:06:43'),
(212,1,3,'customer_deleted','customer',5,'223.185.129.212','2026-09-07 07:06:48'),
(213,1,3,'logout',NULL,NULL,NULL,'2026-09-07 07:07:12'),
(214,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:07:16'),
(215,1,2,'logout',NULL,NULL,NULL,'2026-09-07 07:07:21'),
(216,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:08:05'),
(217,1,3,'logout',NULL,NULL,NULL,'2026-09-07 07:08:10'),
(218,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:08:17'),
(219,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:09:19'),
(220,1,1,'logout',NULL,NULL,NULL,'2026-09-07 07:09:24'),
(221,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:09:27'),
(222,1,2,'logout',NULL,NULL,NULL,'2026-09-07 07:09:29'),
(223,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-07 07:09:32'),
(224,1,3,'logout',NULL,NULL,NULL,'2026-09-07 07:09:35'),
(225,1,2,'logout',NULL,NULL,NULL,'2026-09-07 07:10:03'),
(226,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:00:16'),
(227,1,1,'logout',NULL,NULL,NULL,'2026-09-07 11:00:22'),
(228,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:00:25'),
(229,1,2,'logout',NULL,NULL,NULL,'2026-09-07 11:00:31'),
(230,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:00:34'),
(231,1,3,'logout',NULL,NULL,NULL,'2026-09-07 11:00:59'),
(232,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:01:04'),
(233,1,3,'logout',NULL,NULL,NULL,'2026-09-07 11:01:21'),
(234,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:01:25'),
(235,1,2,'logout',NULL,NULL,NULL,'2026-09-07 11:01:28'),
(236,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:01:31'),
(237,1,3,'logout',NULL,NULL,NULL,'2026-09-07 11:01:34'),
(238,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:01:38'),
(239,1,1,'logout',NULL,NULL,NULL,'2026-09-07 11:01:46'),
(240,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:07:35'),
(241,1,1,'customer_created','customer',15,'223.185.129.212','2026-09-07 11:09:10'),
(242,1,1,'customer_deleted','customer',15,'223.185.129.212','2026-09-07 11:10:34'),
(243,1,1,'logout',NULL,NULL,NULL,'2026-09-07 11:10:48'),
(244,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-07 11:20:11'),
(245,1,1,'logout',NULL,NULL,NULL,'2026-09-07 11:20:55'),
(246,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-08 03:51:27'),
(247,1,1,'logout',NULL,NULL,NULL,'2026-09-08 03:54:01'),
(248,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-08 03:54:03'),
(249,1,2,'logout',NULL,NULL,NULL,'2026-09-08 03:54:19'),
(250,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-08 03:54:21'),
(251,1,3,'logout',NULL,NULL,NULL,'2026-09-08 03:54:27'),
(252,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-08 03:55:30'),
(253,1,1,'bill_imported','bill',20,'103.139.158.138','2026-09-08 04:13:17'),
(254,1,1,'bill_imported','bill',21,'103.139.158.138','2026-09-08 04:13:17'),
(255,1,1,'bill_imported','bill',22,'103.139.158.138','2026-09-08 04:13:17'),
(256,1,1,'bill_imported','bill',23,'103.139.158.138','2026-09-08 04:13:17'),
(257,1,1,'bill_imported','bill',24,'103.139.158.138','2026-09-08 04:13:17'),
(258,1,1,'bill_imported','bill',25,'103.139.158.138','2026-09-08 04:13:17'),
(259,1,1,'bill_imported','bill',26,'103.139.158.138','2026-09-08 04:13:17'),
(260,1,1,'bill_imported','bill',27,'103.139.158.138','2026-09-08 04:13:17'),
(261,1,1,'bill_imported','bill',28,'103.139.158.138','2026-09-08 04:13:17'),
(262,1,1,'bill_imported','bill',29,'103.139.158.138','2026-09-08 04:13:17'),
(263,1,1,'bill_imported','bill',30,'103.139.158.138','2026-09-08 04:13:17'),
(264,1,1,'bill_imported','bill',31,'103.139.158.138','2026-09-08 04:13:17'),
(265,1,1,'bill_imported','bill',32,'103.139.158.138','2026-09-08 04:13:17'),
(266,1,1,'bill_imported','bill',33,'103.139.158.138','2026-09-08 04:13:17'),
(267,1,1,'bill_imported','bill',34,'103.139.158.138','2026-09-08 04:13:17'),
(268,1,1,'bill_imported','bill',35,'103.139.158.138','2026-09-08 04:13:17'),
(269,1,1,'bill_imported','bill',36,'103.139.158.138','2026-09-08 04:13:17'),
(270,1,1,'bill_imported','bill',37,'103.139.158.138','2026-09-08 04:13:17'),
(271,1,1,'bill_imported','bill',38,'103.139.158.138','2026-09-08 04:13:17'),
(272,1,1,'bill_imported','bill',39,'103.139.158.138','2026-09-08 04:13:17'),
(273,1,1,'bill_imported','bill',40,'103.139.158.138','2026-09-08 04:13:17'),
(274,1,1,'bill_imported','bill',41,'103.139.158.138','2026-09-08 04:13:17'),
(275,1,1,'bill_imported','bill',42,'103.139.158.138','2026-09-08 04:13:17'),
(276,1,1,'bill_imported','bill',43,'103.139.158.138','2026-09-08 04:13:17'),
(277,1,1,'bill_imported','bill',44,'103.139.158.138','2026-09-08 04:13:17'),
(278,1,1,'bill_imported','bill',45,'103.139.158.138','2026-09-08 04:13:17'),
(279,1,1,'bill_imported','bill',46,'103.139.158.138','2026-09-08 04:13:17'),
(280,1,1,'bill_imported','bill',47,'103.139.158.138','2026-09-08 04:13:17'),
(281,1,1,'bill_imported','bill',48,'103.139.158.138','2026-09-08 04:13:17'),
(282,1,1,'bill_imported','bill',49,'103.139.158.138','2026-09-08 04:13:17'),
(283,1,1,'bill_imported','bill',50,'103.139.158.138','2026-09-08 04:13:17'),
(284,1,1,'bill_imported','bill',51,'103.139.158.138','2026-09-08 04:13:17'),
(285,1,1,'bill_imported','bill',52,'103.139.158.138','2026-09-08 04:13:17'),
(286,1,1,'bill_imported','bill',53,'103.139.158.138','2026-09-08 04:13:17'),
(287,1,1,'bill_imported','bill',54,'103.139.158.138','2026-09-08 04:13:17'),
(288,1,1,'bill_imported','bill',55,'103.139.158.138','2026-09-08 04:13:17'),
(289,1,1,'bill_imported','bill',56,'103.139.158.138','2026-09-08 04:13:17'),
(290,1,1,'bill_imported','bill',57,'103.139.158.138','2026-09-08 04:13:17'),
(291,1,1,'bill_imported','bill',58,'103.139.158.138','2026-09-08 04:13:17'),
(292,1,1,'bill_imported','bill',59,'103.139.158.138','2026-09-08 04:13:17'),
(293,1,1,'bill_imported','bill',60,'103.139.158.138','2026-09-08 04:13:17'),
(294,1,1,'bill_imported','bill',61,'103.139.158.138','2026-09-08 04:13:17'),
(295,1,1,'bill_imported','bill',62,'103.139.158.138','2026-09-08 04:13:17'),
(296,1,1,'bill_imported','bill',63,'103.139.158.138','2026-09-08 04:13:17'),
(297,1,1,'bill_imported','bill',64,'103.139.158.138','2026-09-08 04:13:17'),
(298,1,1,'bill_imported','bill',65,'103.139.158.138','2026-09-08 04:13:17'),
(299,1,1,'bill_imported','bill',66,'103.139.158.138','2026-09-08 04:13:17'),
(300,1,1,'bill_imported','bill',67,'103.139.158.138','2026-09-08 04:13:17'),
(301,1,1,'bill_imported','bill',68,'103.139.158.138','2026-09-08 04:13:17'),
(302,1,1,'bill_imported','bill',69,'103.139.158.138','2026-09-08 04:13:17'),
(303,1,1,'bill_imported','bill',70,'103.139.158.138','2026-09-08 04:13:17'),
(304,1,1,'bill_imported','bill',71,'103.139.158.138','2026-09-08 04:13:17'),
(305,1,1,'bill_imported','bill',72,'103.139.158.138','2026-09-08 04:13:17'),
(306,1,1,'bill_imported','bill',73,'103.139.158.138','2026-09-08 04:13:17'),
(307,1,1,'bill_imported','bill',74,'103.139.158.138','2026-09-08 04:13:17'),
(308,1,1,'bill_imported','bill',75,'103.139.158.138','2026-09-08 04:13:17'),
(309,1,1,'bill_imported','bill',76,'103.139.158.138','2026-09-08 04:13:17'),
(310,1,1,'bill_imported','bill',77,'103.139.158.138','2026-09-08 04:13:17'),
(311,1,1,'bill_imported','bill',78,'103.139.158.138','2026-09-08 04:13:17'),
(312,1,1,'bill_imported','bill',79,'103.139.158.138','2026-09-08 04:13:17'),
(313,1,1,'bill_imported','bill',80,'103.139.158.138','2026-09-08 04:13:17'),
(314,1,1,'bill_imported','bill',81,'103.139.158.138','2026-09-08 04:13:17'),
(315,1,1,'bill_imported','bill',82,'103.139.158.138','2026-09-08 04:13:17'),
(316,1,1,'bill_imported','bill',83,'103.139.158.138','2026-09-08 04:13:17'),
(317,1,1,'bill_imported','bill',84,'103.139.158.138','2026-09-08 04:13:17'),
(318,1,1,'bill_imported','bill',85,'103.139.158.138','2026-09-08 04:13:37'),
(319,1,1,'bills_deleted_all','bills',NULL,'103.139.158.138','2026-09-08 04:18:13'),
(320,1,1,'customers_deleted_all','customers',NULL,'103.139.158.138','2026-09-08 04:18:18'),
(321,1,1,'logout',NULL,NULL,NULL,'2026-09-08 04:20:30'),
(322,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-08 07:53:36'),
(323,1,1,'logout',NULL,NULL,NULL,'2026-09-08 07:53:40'),
(324,1,2,'login',NULL,NULL,'223.185.129.212','2026-09-08 07:53:43'),
(325,1,2,'logout',NULL,NULL,NULL,'2026-09-08 07:53:46'),
(326,1,3,'login',NULL,NULL,'223.185.129.212','2026-09-08 07:53:49'),
(327,1,3,'logout',NULL,NULL,NULL,'2026-09-08 07:53:53'),
(328,1,1,'login',NULL,NULL,'223.185.129.212','2026-09-08 11:08:29'),
(329,1,1,'logout',NULL,NULL,NULL,'2026-09-08 12:03:23'),
(330,1,1,'login',NULL,NULL,'106.216.226.145','2026-09-08 12:03:42'),
(331,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-08 15:09:15'),
(332,1,1,'logout',NULL,NULL,NULL,'2026-09-08 15:09:24'),
(333,1,2,'login',NULL,NULL,'103.139.158.138','2026-09-08 15:09:26'),
(334,1,2,'logout',NULL,NULL,NULL,'2026-09-08 15:09:29'),
(335,1,3,'login',NULL,NULL,'103.139.158.138','2026-09-08 15:09:31'),
(336,1,1,'login',NULL,NULL,'202.83.19.248','2026-09-09 11:00:25'),
(337,1,1,'logout',NULL,NULL,NULL,'2026-09-09 11:00:35'),
(338,1,2,'login',NULL,NULL,'202.83.19.248','2026-09-09 11:00:37'),
(339,1,2,'logout',NULL,NULL,NULL,'2026-09-09 11:00:39'),
(340,1,3,'login',NULL,NULL,'202.83.19.248','2026-09-09 11:00:41'),
(341,1,3,'logout',NULL,NULL,NULL,'2026-09-09 11:00:43'),
(342,1,1,'login',NULL,NULL,'122.183.54.4','2026-09-10 10:46:36'),
(343,1,1,'logout',NULL,NULL,NULL,'2026-09-10 10:46:40'),
(344,1,3,'login',NULL,NULL,'122.183.54.4','2026-09-10 10:46:44'),
(345,1,3,'logout',NULL,NULL,NULL,'2026-09-10 10:46:47'),
(346,1,3,'login',NULL,NULL,'122.183.54.4','2026-09-10 12:21:39'),
(347,1,3,'logout',NULL,NULL,NULL,'2026-09-10 12:21:42'),
(348,1,2,'login',NULL,NULL,'122.183.54.4','2026-09-10 12:21:46'),
(349,1,2,'logout',NULL,NULL,NULL,'2026-09-10 12:21:49'),
(350,1,3,'login',NULL,NULL,'122.183.54.4','2026-09-10 12:21:52'),
(351,1,3,'logout',NULL,NULL,NULL,'2026-09-10 12:22:04'),
(352,1,1,'login',NULL,NULL,'103.139.158.138','2026-09-11 12:21:41'),
(353,1,1,'login',NULL,NULL,'49.200.166.54','2026-09-12 03:45:20'),
(354,1,1,'login',NULL,NULL,'202.83.19.248','2026-09-15 11:27:58'),
(355,1,1,'logout',NULL,NULL,NULL,'2026-09-15 11:28:20'),
(356,1,1,'login',NULL,NULL,'122.183.54.192','2026-09-17 06:53:55'),
(357,1,1,'login',NULL,NULL,'122.183.54.111','2026-09-21 09:49:04'),
(358,1,2,'login',NULL,NULL,'223.181.110.180','2026-09-22 07:21:19'),
(359,1,3,'login',NULL,NULL,'223.181.110.180','2026-09-22 07:21:27'),
(360,1,1,'login',NULL,NULL,'223.181.110.180','2026-09-22 09:21:10'),
(361,1,1,'logout',NULL,NULL,NULL,'2026-09-22 09:21:57'),
(362,1,1,'login',NULL,NULL,'223.181.110.180','2026-09-22 09:22:00'),
(363,1,1,'login',NULL,NULL,'223.181.110.180','2026-09-22 10:55:53'),
(364,1,1,'customer_created','customer',17,'223.181.110.180','2026-09-22 11:01:30'),
(365,1,1,'bill_created','bill',86,'223.181.110.180','2026-09-22 11:05:31'),
(366,1,1,'bill_created','bill',87,'223.181.110.180','2026-09-22 11:06:26'),
(367,1,1,'customer_updated','customer',17,'223.181.110.180','2026-09-22 11:09:08'),
(368,1,1,'bill_deleted','bill',87,'223.181.110.180','2026-09-22 11:10:05'),
(369,1,1,'bill_updated','bill',86,'223.181.110.180','2026-09-22 11:10:25'),
(370,1,1,'bill_updated','bill',86,'223.181.110.180','2026-09-22 11:13:39'),
(371,1,1,'login',NULL,NULL,'223.181.110.180','2026-09-22 12:05:18'),
(372,1,1,'login',NULL,NULL,'223.181.109.176','2026-09-24 06:46:26'),
(373,1,1,'login',NULL,NULL,'122.183.54.98','2026-10-10 04:50:43'),
(374,1,1,'logout',NULL,NULL,NULL,'2026-10-10 04:51:15'),
(375,1,2,'login',NULL,NULL,'122.183.54.98','2026-10-10 04:51:23'),
(376,1,2,'logout',NULL,NULL,NULL,'2026-10-10 04:51:29'),
(377,1,3,'login',NULL,NULL,'122.183.54.98','2026-10-10 04:51:33'),
(378,1,3,'logout',NULL,NULL,NULL,'2026-10-10 04:51:42'),
(379,1,1,'login',NULL,NULL,'122.183.54.98','2026-10-14 09:54:00'),
(380,1,1,'login',NULL,NULL,'122.183.54.98','2026-10-14 09:58:43'),
(381,1,1,'login',NULL,NULL,'122.183.54.35','2026-10-15 06:05:09'),
(382,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-15 06:05:25'),
(383,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-15 06:05:48'),
(384,1,1,'fund_approved','fund',1,NULL,'2026-10-15 06:15:35'),
(385,NULL,1,'customer_created','customer',18,'122.183.54.35','2026-10-15 06:27:21'),
(386,1,1,'login',NULL,NULL,'106.202.109.2','2026-10-16 05:52:24'),
(387,1,1,'customer_deleted','customer',18,'106.202.109.2','2026-10-16 05:52:44'),
(388,1,1,'login',NULL,NULL,'148.66.153.7','2026-10-19 09:46:22'),
(389,1,1,'te_user_created','te_user',1,'148.66.153.7','2026-10-19 09:46:22'),
(390,1,1,'logout',NULL,NULL,NULL,'2026-10-19 09:46:22'),
(391,1,1,'login',NULL,NULL,'148.66.153.7','2026-10-19 09:47:54'),
(392,1,1,'logout',NULL,NULL,NULL,'2026-10-19 09:47:54'),
(393,1,1,'login',NULL,NULL,'223.181.106.171','2026-10-19 09:49:11'),
(394,1,1,'customer_created','customer',19,'223.181.106.171','2026-10-19 09:51:11'),
(395,1,1,'login',NULL,NULL,'223.181.106.171','2026-10-19 10:23:12'),
(396,1,1,'customer_deleted','customer',19,'223.181.106.171','2026-10-19 10:23:31'),
(397,1,1,'customer_created','customer',20,'223.181.106.171','2026-10-19 10:24:41'),
(398,1,1,'logout',NULL,NULL,NULL,'2026-10-19 10:25:31'),
(399,1,1,'login',NULL,NULL,'223.181.104.250','2026-10-22 07:06:16'),
(400,1,1,'logout',NULL,NULL,NULL,'2026-10-22 09:30:32'),
(401,1,1,'login',NULL,NULL,'223.181.104.250','2026-10-22 09:30:45'),
(402,1,1,'business_rates_updated','business_settings',1,NULL,'2026-10-22 09:32:50'),
(403,NULL,1,'bill_created','bill',88,'223.181.104.250','2026-10-22 10:02:57'),
(404,1,1,'login',NULL,NULL,'223.181.104.250','2026-10-22 10:04:18'),
(405,2,1,'transaction_billed','transaction',1,NULL,'2026-10-22 10:06:11'),
(406,1,1,'bill_deleted','bill',88,'223.181.104.250','2026-10-22 10:35:31'),
(407,1,1,'customer_deleted','customer',20,'223.181.104.250','2026-10-22 10:35:43'),
(408,2,1,'bill_restored','bill',89,'127.0.0.1','2026-10-23 07:56:37'),
(409,1,1,'login',NULL,NULL,'223.181.104.250','2026-10-23 08:55:47'),
(410,NULL,1,'quotation_created','quotation',1,'223.181.104.250','2026-10-23 09:37:30'),
(411,NULL,1,'quotation_created','quotation',2,'223.181.104.250','2026-10-23 09:51:16'),
(412,NULL,1,'quotation_created','quotation',3,'223.181.104.250','2026-10-23 09:52:18'),
(413,1,1,'login',NULL,NULL,'223.181.106.213','2026-10-24 05:28:43'),
(414,1,1,'login',NULL,NULL,'223.181.106.213','2026-10-24 05:35:32'),
(415,1,1,'bill_deleted','bill',89,'223.181.106.213','2026-10-24 05:47:23'),
(416,1,1,'login',NULL,NULL,'223.181.106.213','2026-10-24 10:37:42'),
(417,1,1,'customer_created','customer',22,'223.181.106.213','2026-10-24 10:43:10'),
(418,1,1,'business_rates_updated','business_settings',1,NULL,'2026-10-24 10:44:36'),
(419,1,1,'business_rates_updated','business_settings',1,NULL,'2026-10-24 10:45:08'),
(420,1,1,'quotation_created','quotation',4,'223.181.106.213','2026-10-24 10:45:50'),
(421,1,1,'login',NULL,NULL,'223.181.106.122','2026-10-28 10:06:21'),
(422,1,1,'login',NULL,NULL,'223.181.106.122','2026-10-28 12:23:39'),
(423,1,1,'login',NULL,NULL,'223.185.133.168','2026-11-02 05:06:44'),
(424,1,1,'logout',NULL,NULL,NULL,'2026-11-02 05:09:41'),
(425,2,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-11-02 06:57:19'),
(426,1,1,'login',NULL,NULL,'223.185.130.131','2026-11-04 09:42:59'),
(427,1,1,'customer_created','customer',23,'223.185.130.131','2026-11-04 09:56:27'),
(428,1,1,'bill_created','bill',90,'223.185.130.131','2026-11-04 10:02:01'),
(429,1,1,'bill_created','bill',91,'223.185.130.131','2026-11-04 10:40:54'),
(430,1,1,'logout',NULL,NULL,NULL,'2026-11-04 10:56:49'),
(431,1,1,'login',NULL,NULL,'223.185.130.131','2026-11-04 11:00:44'),
(432,NULL,1,'statewise_invoice_reset','bill',86,NULL,'2026-11-04 12:05:04'),
(433,NULL,1,'bill_created','bill',92,'223.185.130.131','2026-11-04 12:27:17'),
(434,NULL,1,'bill_created','bill',93,'223.185.130.131','2026-11-04 12:29:08'),
(435,2,1,'transaction_billed','transaction',3,NULL,'2026-11-04 12:30:20'),
(436,2,1,'transaction_billed','transaction',2,NULL,'2026-11-04 12:30:23'),
(437,NULL,NULL,'gold_transfer_manual_revert','branch_gold_transfer',2,NULL,'2026-11-04 13:26:27');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bill_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` bigint(20) unsigned NOT NULL,
  `description` varchar(190) NOT NULL,
  `item_description` varchar(190) DEFAULT NULL,
  `hsn_code` varchar(30) DEFAULT NULL,
  `purity` varchar(30) DEFAULT NULL,
  `metal` enum('gold','silver') NOT NULL DEFAULT 'gold',
  `gross_weight_mg` bigint(20) NOT NULL DEFAULT 0,
  `stone_weight_mg` bigint(20) NOT NULL DEFAULT 0,
  `weight_mg` bigint(20) NOT NULL,
  `rate_paise_per_gram` bigint(20) NOT NULL,
  `making_paise` bigint(20) NOT NULL DEFAULT 0,
  `amount_paise` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bill_items_bill` (`bill_id`),
  CONSTRAINT `fk_item_bill` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bill_items` WRITE;
/*!40000 ALTER TABLE `bill_items` DISABLE KEYS */;
INSERT INTO `bill_items` VALUES
(89,86,'Gold Ornament',NULL,'711319','22','gold',44400,0,44400,1351355,0,60000162),
(92,90,'Gold Ornament',NULL,'711319','24K / 999','gold',15000,2000,13000,1520000,0,19760000),
(93,90,'Gold Bullion',NULL,'710812','24K / 999','gold',25000,0,25000,1520000,0,38000000),
(94,91,'Gold Ornament',NULL,'711319','24K / 999','gold',25000,5000,20000,1450000,0,29000000),
(95,91,'Gold Ornament',NULL,'711319','24K / 999','gold',300000,20000,280000,1450000,0,406000000),
(96,92,'Gold Ornament','chain, ring','711319','24K / 999','gold',25000,5000,20000,1450000,0,29000000),
(97,93,'Gold Bullion','bricks','710812','24K / 999','gold',123000,23000,100000,1450000,0,145000000);
/*!40000 ALTER TABLE `bill_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bill_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` bigint(20) unsigned NOT NULL,
  `payment_method` varchar(40) NOT NULL,
  `amount_paise` bigint(20) unsigned NOT NULL,
  `reference_text` varchar(190) DEFAULT NULL,
  `account_number` text DEFAULT NULL,
  `ifsc_code` varchar(11) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `payment_status` enum('not_required','pending','paid') NOT NULL DEFAULT 'not_required',
  `utr_number` varchar(100) DEFAULT NULL,
  `paid_by_account_user_id` int(10) unsigned DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bill_payments_bill` (`bill_id`),
  KEY `idx_bill_payments_method` (`payment_method`),
  KEY `idx_bill_payments_status` (`payment_status`,`payment_method`),
  KEY `fk_bill_payment_accounts_user` (`paid_by_account_user_id`),
  CONSTRAINT `fk_bill_payment_accounts_user` FOREIGN KEY (`paid_by_account_user_id`) REFERENCES `accounts_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bill_payment_bill` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bill_payments` WRITE;
/*!40000 ALTER TABLE `bill_payments` DISABLE KEYS */;
INSERT INTO `bill_payments` VALUES
(3,90,'bank_transfer',59492800,'A/C ••••2345 · IRDI0000097','fTyLL5T7kwaSym3p.vwr0OtHgs8oPH8svVsDbtQ.hZHm_dYqMCRqsz4O4hVK','IRDI0000097',NULL,'pending',NULL,NULL,NULL,'2026-11-04 10:02:01'),
(4,91,'bank_transfer',435000000,'A/C ••••4654 · UYTH0000054','w7Ho7P0W0oPBBe69.CzVdlyR0sisWQLLYveeuAg.60ZjutGnu-WmR4I6gg','UYTH0000054',NULL,'pending',NULL,NULL,NULL,'2026-11-04 10:40:54'),
(5,92,'bank_transfer',29000000,'A/C ••••7263 · GTHY0018762','jovGX4MiJGCBAOHK.mE1aPqvU8PszTAU53JyrSw.OOwIp-ZgnbKoKEDhF9zq','GTHY0018762',NULL,'pending',NULL,NULL,NULL,'2026-11-04 12:27:17'),
(6,93,'bank_transfer',145000000,'A/C ••••1623 · ASDF0000023','FEwvpwhvfj1wHSmN.BebLIwxJCQxaIcgASCyxFQ.64kw0c5W6CFXQ2jE6Q','ASDF0000023',NULL,'pending',NULL,NULL,NULL,'2026-11-04 12:29:08');
/*!40000 ALTER TABLE `bill_payments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bills` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `bill_number` varchar(40) NOT NULL,
  `transaction_type` enum('sale','purchase') NOT NULL,
  `bill_date` date NOT NULL,
  `subtotal_paise` bigint(20) NOT NULL,
  `tax_paise` bigint(20) NOT NULL DEFAULT 0,
  `cgst_paise` bigint(20) NOT NULL DEFAULT 0,
  `sgst_paise` bigint(20) NOT NULL DEFAULT 0,
  `cgst_rate_bps` int(10) unsigned NOT NULL DEFAULT 0,
  `sgst_rate_bps` int(10) unsigned NOT NULL DEFAULT 0,
  `adjustment_paise` bigint(20) NOT NULL DEFAULT 0,
  `total_paise` bigint(20) NOT NULL,
  `payment_method` varchar(40) NOT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `origin_branch_id` varchar(100) DEFAULT NULL,
  `origin_state_code` char(2) NOT NULL DEFAULT 'KA',
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `release_place` varchar(190) DEFAULT NULL,
  `release_amount_paise` bigint(20) unsigned DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `account_number` text DEFAULT NULL,
  `ifsc_code` varchar(11) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `cheque_number` varchar(20) DEFAULT NULL,
  `card_number` text DEFAULT NULL,
  `ornament_image_path` varchar(255) DEFAULT NULL,
  `signature_image_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bill_company_number` (`company_id`,`bill_number`),
  KEY `idx_bill_company_date` (`company_id`,`bill_date`),
  KEY `fk_bill_customer` (`customer_id`),
  KEY `fk_bill_admin` (`created_by`),
  CONSTRAINT `fk_bill_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_bill_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_bill_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bills` WRITE;
/*!40000 ALTER TABLE `bills` DISABLE KEYS */;
INSERT INTO `bills` VALUES
(86,1,17,'AG/KA/2627/01','purchase','2026-09-22',60000162,0,0,0,0,0,0,60000162,'bank_transfer',NULL,NULL,'KA',NULL,NULL,NULL,1,'2026-09-22 11:05:31','ZIFtc-BkZ2RjlrSm.OqDfIbcCRl7AS-d1jp8Drw.__PaVyzPy_fTka8KLQje','YESB0000658',NULL,NULL,NULL,NULL,NULL),
(90,1,23,'AG/2627/83','sale','2026-11-04',57760000,1732800,866400,866400,150,150,0,59492800,'bank_transfer',NULL,NULL,'KA',NULL,NULL,NULL,1,'2026-11-04 10:02:01','sAebynHlzjPE77xg.MoY43KJLixhOMJ8igK4DQQ.EXbHs99rLaEfAGjnP7Pf','IRDI0000097',NULL,NULL,NULL,'[\"1/cd74a6f7c1be0506c498c395ef3a539ac3bee088.jpg\",\"1/307261039d929d5df7a11ccea8354c1497e0a7db.jpg\",\"1/36029f00b74b43e4926af07b2e1789625344fcc6.jpg\"]','1/bedd29d9a327bd59bac3dfabc0e831328deda633.jpg'),
(91,1,23,'AG/2627/84','purchase','2026-11-04',435000000,0,0,0,0,0,0,435000000,'bank_transfer',NULL,NULL,'KA',NULL,NULL,NULL,1,'2026-11-04 10:40:54','KTuCL3uumtK4KEh8.dJlLwepvxMwtZloNz0l5Lg.ls_F9w_kP2BKDLnvoQ','UYTH0000054',NULL,NULL,NULL,'[\"1/0b8ece18e08c5c0f2a4a5d945de2cebd0c9402e5.jpg\",\"1/9a6be01259dea0b81c09db09a791274f9a63a2a0.jpg\",\"1/50d64fef8c89dd0ed924e123e41c9ecde77baa57.jpg\"]','1/c6ad85048f061ea1acbad593ab9f05a0bd133cfd.jpg'),
(92,1,23,'AG/KA/2627/02','purchase','2026-11-04',29000000,0,0,0,0,0,0,29000000,'bank_transfer',NULL,'AGBPL002','KA','10001',NULL,NULL,NULL,'2026-11-04 12:27:17','BFdBOFA6A2-foU_3.dYUlTcX_vfY6Gbe7TWOT8w.sc4znOFJ78vgxkMGyiwN','GTHY0018762',NULL,NULL,NULL,'1/f20c0fddf86720aca4121115e5ec5a5d1c495886.jpg','1/37a378a551853a88bea636e5f4ca4e956cb10d50.jpg'),
(93,1,21,'AG/KA/2627/03','purchase','2026-11-04',145000000,0,0,0,0,0,0,145000000,'bank_transfer','asdassd','AGBPL002','KA','10001',NULL,NULL,NULL,'2026-11-04 12:29:08','P3DeHPH4lyXps9Nt.Y2LpaYdCuNoLcOeTa3g7yA.krx-4qiqS8WqpUkZ8A','ASDF0000023',NULL,NULL,NULL,'1/504430bc58c43b8909746c6e7f2a70347d7308d5.jpg','1/2b4489c20c7e7dd1bcd64a74c810051eb63bd5a8.jpg');
/*!40000 ALTER TABLE `bills` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `name` varchar(190) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` varchar(500) DEFAULT NULL,
  `created_by_employee_id` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_customer_phone` (`branch_id`,`phone`),
  KEY `idx_branch_customers_branch` (`branch_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_customers` WRITE;
/*!40000 ALTER TABLE `branch_customers` DISABLE KEYS */;
INSERT INTO `branch_customers` VALUES
(1,'AGBPL002','Attica VK','9876543210','1, 4th floor','10001','2026-10-15 06:27:21'),
(2,'AGBPL002','thousif kamal','3582763619','amsdasd asjdjhakjshd asdasd asdasd,aasd, asd 23asd,asda','10001','2026-11-04 12:27:17');
/*!40000 ALTER TABLE `branch_customers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_daily_closings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_daily_closings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `closing_date` date NOT NULL,
  `opening_cash_paise` bigint(20) unsigned NOT NULL,
  `transaction_count` int(10) unsigned NOT NULL,
  `expenses_paise` bigint(20) unsigned NOT NULL,
  `gold_purchased_mg` bigint(20) unsigned NOT NULL,
  `amount_paid_paise` bigint(20) unsigned NOT NULL,
  `gold_sent_to_ho_mg` bigint(20) unsigned NOT NULL,
  `gold_in_branch_stock_mg` bigint(20) unsigned NOT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `created_by_employee_id` varchar(100) NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_closing_date` (`branch_id`,`closing_date`),
  KEY `idx_branch_closings_date` (`closing_date`,`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_daily_closings` WRITE;
/*!40000 ALTER TABLE `branch_daily_closings` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_daily_closings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_expenses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(100) NOT NULL,
  `amount_paise` bigint(20) unsigned NOT NULL,
  `description` varchar(500) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_by_employee_id` varchar(100) NOT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `admin_notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_branch_expenses_review` (`status`,`created_at`),
  KEY `idx_branch_expenses_branch` (`branch_id`,`expense_date`),
  KEY `fk_branch_expense_admin` (`reviewed_by`),
  CONSTRAINT `fk_branch_expense_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_expenses` WRITE;
/*!40000 ALTER TABLE `branch_expenses` DISABLE KEYS */;
INSERT INTO `branch_expenses` VALUES
(1,'AGBPL002','2026-10-23','Stationery',15000,'Pen, books, a4 size sheet','pending','10001',NULL,NULL,NULL,'2026-10-23 10:02:07','2026-10-23 10:02:07');
/*!40000 ALTER TABLE `branch_expenses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_fund_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_fund_ledger` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `direction` enum('credit','debit') NOT NULL,
  `amount_paise` bigint(20) unsigned NOT NULL,
  `entry_type` varchar(60) NOT NULL,
  `reference_id` bigint(20) unsigned NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `created_by_admin_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_fund_entry` (`entry_type`,`reference_id`,`direction`),
  KEY `idx_branch_fund_ledger` (`branch_id`,`created_at`),
  KEY `fk_branch_fund_ledger_admin` (`created_by_admin_id`),
  CONSTRAINT `fk_branch_fund_ledger_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_fund_ledger` WRITE;
/*!40000 ALTER TABLE `branch_fund_ledger` DISABLE KEYS */;
INSERT INTO `branch_fund_ledger` VALUES
(1,'AGBPL002','credit',10000000,'fund_request_approved',1,'Fund request approved',NULL,1,'2026-10-15 06:15:35');
/*!40000 ALTER TABLE `branch_fund_ledger` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_gold_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_gold_transfer_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_id` bigint(20) unsigned NOT NULL,
  `transaction_id` bigint(20) unsigned NOT NULL,
  `bill_id` bigint(20) unsigned NOT NULL,
  `bill_item_id` bigint(20) unsigned NOT NULL,
  `sent_weight_mg` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gold_transfer_bill_item` (`bill_item_id`),
  KEY `idx_gold_transfer_items_transfer` (`transfer_id`),
  KEY `idx_gold_transfer_items_transaction` (`transaction_id`),
  KEY `fk_gold_transfer_item_bill` (`bill_id`),
  CONSTRAINT `fk_gold_transfer_item_bill` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`),
  CONSTRAINT `fk_gold_transfer_item_bill_item` FOREIGN KEY (`bill_item_id`) REFERENCES `bill_items` (`id`),
  CONSTRAINT `fk_gold_transfer_item_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `branch_transactions` (`id`),
  CONSTRAINT `fk_gold_transfer_item_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `branch_gold_transfers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_gold_transfer_items` WRITE;
/*!40000 ALTER TABLE `branch_gold_transfer_items` DISABLE KEYS */;
INSERT INTO `branch_gold_transfer_items` VALUES
(5,3,2,92,96,20000,'2026-11-04 13:29:42'),
(6,3,3,93,97,100000,'2026-11-04 13:29:42');
/*!40000 ALTER TABLE `branch_gold_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_gold_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_gold_transfers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `weight_mg` bigint(20) unsigned NOT NULL,
  `gross_weight_mg` bigint(20) unsigned NOT NULL DEFAULT 0,
  `transfer_value_paise` bigint(20) unsigned NOT NULL DEFAULT 0,
  `tare_weight_mg` bigint(20) unsigned NOT NULL DEFAULT 0,
  `bm_name` varchar(190) DEFAULT NULL,
  `bm_phone` varchar(20) DEFAULT NULL,
  `itr_number` varchar(100) DEFAULT NULL,
  `itr_date` date DEFAULT NULL,
  `origin_state` varchar(100) DEFAULT NULL,
  `origin_state_code` char(2) DEFAULT NULL,
  `place_of_supply` varchar(100) DEFAULT NULL,
  `transporter_name` varchar(190) DEFAULT NULL,
  `transporter_gstin` varchar(20) DEFAULT NULL,
  `transportation_mode` varchar(20) DEFAULT NULL,
  `shipper_details` text DEFAULT NULL,
  `consignee_details` text DEFAULT NULL,
  `purpose_of_movement` varchar(190) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `status` enum('submitted','received','rejected') NOT NULL DEFAULT 'submitted',
  `created_by_employee_id` varchar(100) NOT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `admin_notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_gold_transfer_itr` (`itr_number`),
  KEY `idx_branch_gold_transfer_review` (`status`,`created_at`),
  KEY `idx_branch_gold_transfer_branch` (`branch_id`,`created_at`),
  KEY `fk_branch_gold_transfer_admin` (`reviewed_by`),
  CONSTRAINT `fk_branch_gold_transfer_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_gold_transfers` WRITE;
/*!40000 ALTER TABLE `branch_gold_transfers` DISABLE KEYS */;
INSERT INTO `branch_gold_transfers` VALUES
(1,'AGBPL002',120000,0,0,129000,'Vinay','8176312983',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'rejected','10001',NULL,'2026-11-04 12:47:59','Reverted at user request. Original dispatch by Vinay (10001); released bills AG/KA/2627/02 and AG/KA/2627/03.','2026-11-04 12:41:05','2026-11-04 12:47:59'),
(2,'AGBPL002',120000,148000,174000000,0,NULL,NULL,NULL,'2026-11-04','Karnataka','29','Karnataka','Lingaraju(98765432211)',NULL,'BY ROAD','Firm Name: ARYAN GOLD PRIVATE LIMITED, Jayanagar\nBranch ID: AGBPL002\nNo.480 / 17,  45th Crosss, 8th Block, Jayanagar, Bengaluru, 5600704\nBengaluru - 560070\nState: Karnataka\nGSTIN: 29ABGCA9333E1ZK','Firm Name: ARYAN GOLD PRIVATE LIMITED, HEAD OFFICE\nNo 15, 1st Floor, Siddhi Nilaya, 4th Cross, Jalahalli, Bangalore North, Bangalore - 560013, Karnataka\nBengaluru - 560013\nState: Karnataka\nGSTIN: 29ABGCA9333E1ZK\nContact: +91 90354 22321','STOCK TRANSFER','Firm Name: ARYAN GOLD PRIVATE LIMITED, HEAD OFFICE\nNo 15, 1st Floor, Siddhi Nilaya, 4th Cross, Jalahalli, Bangalore North, Bangalore - 560013, Karnataka\nBengaluru - 560013\nState: Karnataka\nGSTIN: 29ABGCA9333E1ZK\nContact: +91 90354 22321',NULL,'rejected','10001',NULL,'2026-11-04 13:26:27','Manual revert: accidental Jayanagar dispatch by Vinay (10001); ITR/0411/AGBPL002/01 voided.','2026-11-04 12:55:44','2026-11-04 13:26:27'),
(3,'AGBPL002',120000,148000,174000000,167000,'Vinay','9871982739','ITR/0411/AGBPL002/02','2026-11-04','Karnataka','29','Karnataka','Kumar(98273987483)',NULL,'BY ROAD','Firm Name: ARYAN GOLD PRIVATE LIMITED, Jayanagar\nBranch ID: AGBPL002\nNo.480 / 17,  45th Crosss, 8th Block, Jayanagar, Bengaluru, 5600704\nBengaluru - 560070\nState: Karnataka\nGSTIN: 29ABGCA9333E1ZK','Firm Name: ARYAN GOLD PRIVATE LIMITED, HEAD OFFICE\nNo 15, 1st Floor, Siddhi Nilaya, 4th Cross, Jalahalli, Bangalore North, Bangalore - 560013, Karnataka\nBengaluru - 560013\nState: Karnataka\nGSTIN: 29ABGCA9333E1ZK\nContact: +91 90354 22321','STOCK TRANSFER','Firm Name: ARYAN GOLD PRIVATE LIMITED, HEAD OFFICE\nNo 15, 1st Floor, Siddhi Nilaya, 4th Cross, Jalahalli, Bangalore North, Bangalore - 560013, Karnataka\nBengaluru - 560013\nState: Karnataka\nGSTIN: 29ABGCA9333E1ZK\nContact: +91 90354 22321',NULL,'submitted','10001',NULL,NULL,NULL,'2026-11-04 13:29:42','2026-11-04 13:29:42');
/*!40000 ALTER TABLE `branch_gold_transfers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `verification_request_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(190) NOT NULL,
  `body` varchar(1000) NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_branch_notifications_user` (`branch_id`,`employee_id`,`read_at`,`created_at`),
  KEY `fk_branch_notification_verification` (`verification_request_id`),
  CONSTRAINT `fk_branch_notification_verification` FOREIGN KEY (`verification_request_id`) REFERENCES `customer_verification_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_notifications` WRITE;
/*!40000 ALTER TABLE `branch_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_pledge_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_pledge_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint(20) unsigned NOT NULL,
  `document_path` varchar(255) NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pledge_documents_transaction` (`transaction_id`),
  CONSTRAINT `fk_pledge_document_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `branch_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_pledge_documents` WRITE;
/*!40000 ALTER TABLE `branch_pledge_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_pledge_documents` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `branch_id` varchar(100) NOT NULL,
  `branch_name` varchar(190) NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `employee_name` varchar(190) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_sessions_token` (`token_hash`),
  KEY `idx_branch_sessions_expiry` (`expires_at`),
  KEY `idx_branch_sessions_branch` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_sessions` WRITE;
/*!40000 ALTER TABLE `branch_sessions` DISABLE KEYS */;
-- Rows from branch_sessions were removed from the public demo snapshot.
/*!40000 ALTER TABLE `branch_sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_stock_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_stock_ledger` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `direction` enum('in','out') NOT NULL,
  `weight_mg` bigint(20) unsigned NOT NULL,
  `entry_type` varchar(60) NOT NULL,
  `reference_id` bigint(20) unsigned NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `created_by_admin_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_stock_entry` (`entry_type`,`reference_id`,`direction`),
  KEY `idx_branch_stock_ledger` (`branch_id`,`created_at`),
  KEY `fk_branch_stock_ledger_admin` (`created_by_admin_id`),
  CONSTRAINT `fk_branch_stock_ledger_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_stock_ledger` WRITE;
/*!40000 ALTER TABLE `branch_stock_ledger` DISABLE KEYS */;
INSERT INTO `branch_stock_ledger` VALUES
(1,'AGBPL002','in',20000,'purchase_billed',1,'Walk-in gold purchase billed',NULL,2,'2026-10-22 10:06:11'),
(2,'AGBPL002','out',20000,'bill_deleted_reversal',1,'Admin deletion reversal for bill AG/2627/82',NULL,1,'2026-10-24 05:47:23'),
(3,'AGBPL002','in',100000,'purchase_billed',3,'Walk-in gold purchase billed',NULL,2,'2026-11-04 12:30:20'),
(4,'AGBPL002','in',20000,'purchase_billed',2,'Walk-in gold purchase billed',NULL,2,'2026-11-04 12:30:23'),
(5,'AGBPL002','out',120000,'ho_transfer_sent',1,'Gold sent to Head Office','10001',NULL,'2026-11-04 12:41:05'),
(6,'AGBPL002','in',120000,'ho_transfer_reversed',1,'Reversal of Gold to HO dispatch #1 by Vinay (10001)',NULL,NULL,'2026-11-04 12:47:59'),
(7,'AGBPL002','out',120000,'ho_transfer_sent',2,'Gold sent to Head Office','10001',NULL,'2026-11-04 12:55:44'),
(8,'AGBPL002','in',120000,'ho_transfer_rejected',2,'Manual revert: accidental Jayanagar Head Office dispatch; ITR 01 voided',NULL,NULL,'2026-11-04 13:26:27'),
(9,'AGBPL002','out',120000,'ho_transfer_sent',3,'Gold sent to Head Office','10001',NULL,'2026-11-04 13:29:42');
/*!40000 ALTER TABLE `branch_stock_ledger` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `transaction_type` enum('purchase','sale') NOT NULL DEFAULT 'purchase',
  `business_mode` enum('walkin','pledged') NOT NULL DEFAULT 'walkin',
  `gold_weight_mg` bigint(20) unsigned NOT NULL,
  `rate_paise_per_gram` bigint(20) unsigned NOT NULL,
  `amount_paise` bigint(20) unsigned NOT NULL,
  `pledge_amount_paise` bigint(20) unsigned DEFAULT NULL,
  `release_place` varchar(190) DEFAULT NULL,
  `release_amount_paise` bigint(20) unsigned DEFAULT NULL,
  `pledge_document_path` varchar(255) DEFAULT NULL,
  `pledge_document_name` varchar(255) DEFAULT NULL,
  `pledge_payment_method` varchar(40) DEFAULT NULL,
  `pledge_payment_details` text DEFAULT NULL,
  `pledge_status` enum('not_applicable','awaiting_release','released','cancelled') NOT NULL DEFAULT 'not_applicable',
  `pledge_resolved_at` datetime DEFAULT NULL,
  `bill_id` bigint(20) unsigned DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `status` enum('awaiting_pledge','submitted','transit','billed','rejected') NOT NULL DEFAULT 'submitted',
  `created_by_employee_id` varchar(100) NOT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_transaction_bill` (`bill_id`),
  KEY `idx_branch_transactions_review` (`status`,`created_at`),
  KEY `idx_branch_transactions_branch` (`branch_id`,`created_at`),
  KEY `fk_branch_transaction_customer` (`customer_id`),
  KEY `fk_branch_transaction_admin` (`reviewed_by`),
  CONSTRAINT `fk_branch_transaction_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_branch_transaction_bill` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_branch_transaction_customer` FOREIGN KEY (`customer_id`) REFERENCES `branch_customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_transactions` WRITE;
/*!40000 ALTER TABLE `branch_transactions` DISABLE KEYS */;
INSERT INTO `branch_transactions` VALUES
(2,'AGBPL002',2,'purchase','walkin',20000,1450000,29000000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,92,'Detailed bill AG/KA/2627/02','billed','10001',2,'2026-11-04 12:30:23','2026-11-04 12:27:17','2026-11-04 12:30:23'),
(3,'AGBPL002',1,'purchase','walkin',100000,1450000,145000000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,93,'Detailed bill AG/KA/2627/03 · asdassd','billed','10001',2,'2026-11-04 12:30:20','2026-11-04 12:29:08','2026-11-04 12:30:20');
/*!40000 ALTER TABLE `branch_transactions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_visit_notification_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_visit_notification_reads` (
  `notification_id` bigint(20) unsigned NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`,`employee_id`),
  KEY `idx_branch_visit_notification_reader` (`employee_id`,`read_at`),
  CONSTRAINT `fk_branch_visit_notification_read` FOREIGN KEY (`notification_id`) REFERENCES `branch_visit_notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_visit_notification_reads` WRITE;
/*!40000 ALTER TABLE `branch_visit_notification_reads` DISABLE KEYS */;
INSERT INTO `branch_visit_notification_reads` VALUES
(4,'10001','2026-10-27 07:00:24'),
(10,'10001','2026-10-27 07:08:11'),
(13,'10001','2026-10-27 07:09:53'),
(14,'10001','2026-10-27 07:10:06'),
(6,'10001','2026-10-28 12:25:51'),
(5,'10001','2026-10-28 12:25:52'),
(12,'10001','2026-10-28 12:25:54'),
(15,'10001','2026-10-28 12:25:57'),
(11,'10001','2026-10-28 12:25:58');
/*!40000 ALTER TABLE `branch_visit_notification_reads` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branch_visit_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_visit_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `visit_id` bigint(20) unsigned NOT NULL,
  `branch_id` varchar(100) NOT NULL,
  `notification_kind` enum('arrival','30_minutes','15_minutes') NOT NULL,
  `title` varchar(190) NOT NULL,
  `body` varchar(1000) NOT NULL,
  `deliver_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_visit_notification` (`visit_id`,`notification_kind`),
  KEY `idx_branch_visit_notification_due` (`branch_id`,`deliver_at`),
  CONSTRAINT `fk_branch_visit_notification_visit` FOREIGN KEY (`visit_id`) REFERENCES `contact_branch_visits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branch_visit_notifications` WRITE;
/*!40000 ALTER TABLE `branch_visit_notifications` DISABLE KEYS */;
INSERT INTO `branch_visit_notifications` VALUES
(1,1,'AGPL001','arrival','Customer visit scheduled','Webhook Verification is coming to Malleswaram branch on 2026-10-28 at 12:00 (Asia/Kolkata).','2026-10-27 06:57:40','2026-10-27 06:57:40'),
(2,1,'AGPL001','30_minutes','Customer arriving in 30 minutes','Webhook Verification is expected at Malleswaram branch at 12:00.','2026-10-28 06:00:00','2026-10-27 06:57:40'),
(3,1,'AGPL001','15_minutes','Customer arriving in 15 minutes','Webhook Verification is expected at Malleswaram branch at 12:00.','2026-10-28 06:15:00','2026-10-27 06:57:40'),
(4,2,'AGBPL002','arrival','Customer visit scheduled','Webhook Verification AGBPL002 is coming to AGBPL002 branch on 2026-10-28 at 12:15 (Asia/Kolkata).','2026-10-27 06:58:25','2026-10-27 06:58:25'),
(5,2,'AGBPL002','30_minutes','Customer arriving in 30 minutes','Webhook Verification AGBPL002 is expected at AGBPL002 branch at 12:15.','2026-10-28 06:15:00','2026-10-27 06:58:25'),
(6,2,'AGBPL002','15_minutes','Customer arriving in 15 minutes','Webhook Verification AGBPL002 is expected at AGBPL002 branch at 12:15.','2026-10-28 06:30:00','2026-10-27 06:58:25'),
(7,3,'AGPL002','arrival','Customer visit scheduled','Test is coming to White Field branch on 2026-10-27 at 13:32 (Asia/Kolkata).','2026-10-27 07:01:58','2026-10-27 07:01:58'),
(8,3,'AGPL002','30_minutes','Customer arriving in 30 minutes','Test is expected at White Field branch at 13:32.','2026-10-27 07:32:00','2026-10-27 07:01:58'),
(9,3,'AGPL002','15_minutes','Customer arriving in 15 minutes','Test is expected at White Field branch at 13:32.','2026-10-27 07:47:00','2026-10-27 07:01:58'),
(10,4,'AGBPL002','arrival','Customer visit scheduled','abhi rock is coming to Jayanagar branch on 2026-10-27 at 13:20 (Asia/Kolkata).','2026-10-27 07:07:58','2026-10-27 07:07:58'),
(11,4,'AGBPL002','30_minutes','Customer arriving in 30 minutes','abhi rock is expected at Jayanagar branch at 13:20.','2026-10-27 07:20:00','2026-10-27 07:07:58'),
(12,4,'AGBPL002','15_minutes','Customer arriving in 15 minutes','abhi rock is expected at Jayanagar branch at 13:20.','2026-10-27 07:35:00','2026-10-27 07:07:58'),
(13,5,'AGBPL002','arrival','Customer visit scheduled','Popup Deployment Test is coming to Jayanagar branch on 2026-10-27 at 13:10 (Asia/Kolkata).','2026-10-27 07:09:48','2026-10-27 07:09:48'),
(14,5,'AGBPL002','30_minutes','Customer arriving in 30 minutes','Popup Deployment Test is expected at Jayanagar branch at 13:10.','2026-10-27 07:10:00','2026-10-27 07:09:48'),
(15,5,'AGBPL002','15_minutes','Customer arriving in 15 minutes','Popup Deployment Test is expected at Jayanagar branch at 13:10.','2026-10-27 07:25:00','2026-10-27 07:09:48');
/*!40000 ALTER TABLE `branch_visit_notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `business_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_settings` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `sale_rate_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `purchase_rate_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `purchase_rate_750_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `sale_rate_750_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `purchase_rate_916_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `sale_rate_916_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `purchase_rate_999_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `sale_rate_999_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_business_settings_admin` (`updated_by`),
  CONSTRAINT `fk_business_settings_admin` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `business_settings` WRITE;
/*!40000 ALTER TABLE `business_settings` DISABLE KEYS */;
INSERT INTO `business_settings` VALUES
(1,1520000,1450000,1050000,1150000,1260000,1400000,1450000,1520000,1,'2026-10-24 10:45:08');
/*!40000 ALTER TABLE `business_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sender_user_id` bigint(20) unsigned NOT NULL,
  `recipient_user_id` bigint(20) unsigned NOT NULL,
  `body` text DEFAULT NULL,
  `attachment_path` varchar(500) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_mime` varchar(150) DEFAULT NULL,
  `attachment_size` bigint(20) unsigned DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_chat_sender_recipient_date` (`sender_user_id`,`recipient_user_id`,`created_at`),
  KEY `idx_chat_recipient_unread` (`recipient_user_id`,`read_at`,`created_at`),
  CONSTRAINT `fk_chat_message_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `chat_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_message_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `chat_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_chat_message_content` CHECK (`body` is not null or `attachment_path` is not null),
  CONSTRAINT `chk_chat_message_recipient` CHECK (`sender_user_id` <> `recipient_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `chat_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_type` enum('admin','branch','head_office','accounts') NOT NULL,
  `actor_key` varchar(190) NOT NULL,
  `username` varchar(190) NOT NULL,
  `display_name` varchar(190) NOT NULL,
  `role_label` varchar(190) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_seen_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_user_actor` (`actor_type`,`actor_key`),
  KEY `idx_chat_users_active_name` (`active`,`display_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11646 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `chat_users` WRITE;
/*!40000 ALTER TABLE `chat_users` DISABLE KEYS */;
INSERT INTO `chat_users` VALUES
(1,'admin','admin:1','admin@aryangold.in','Aryan Gold Administrator','Administrator',1,'2026-11-04 12:48:30','2026-10-14 11:31:33','2026-11-04 12:48:30'),
(2,'admin','admin:2','floor-user@internal.aryangold','Floor Operations User','Administrator',0,'2026-10-14 11:31:33','2026-10-14 11:31:33','2026-10-14 11:31:33'),
(4,'head_office','head-office:1','auditor','Head Office Auditor','Head Office Auditor',1,'2026-10-14 11:31:33','2026-10-14 11:31:33','2026-10-14 11:31:33'),
(5,'head_office','head-office:2','melter','Head Office Melter','Head Office Melter',1,'2026-10-14 11:31:33','2026-10-14 11:31:33','2026-10-14 11:31:33'),
(6,'head_office','head-office:3','floor','Floor Operations User','Floor Operations',1,'2026-11-04 13:32:54','2026-10-14 11:31:33','2026-11-04 13:32:54'),
(7,'accounts','accounts:1','accounts','Accounts Executive','Accounts',1,'2026-10-14 11:31:33','2026-10-14 11:31:33','2026-10-14 11:31:33'),
(34,'branch','branch:AGBPL002:10001','10001','Vinay','Jayanagar Branch',1,'2026-11-04 13:33:01','2026-10-15 06:12:01','2026-11-04 13:33:01');
/*!40000 ALTER TABLE `chat_users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `short_name` varchar(10) NOT NULL,
  `logo_path` varchar(255) NOT NULL,
  `invoice_prefix` varchar(12) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_companies_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES
(1,'aryan-gold','Aryan Gold','AG','/brands/aryan-gold.webp','AG','2026-08-26 09:40:04'),
(2,'aryan-jewels','Aryan Jewels','AJ','/brands/aryan-jewels.png','AJ','2026-08-26 09:40:04'),
(3,'lakshmi-bullion','Lakshmi Bullion','LB','/brands/lakshmi-bullion-gold.png','LB','2026-08-26 09:40:04');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `contact_branch_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_branch_visits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_key` char(64) NOT NULL,
  `event_name` varchar(100) NOT NULL,
  `status` varchar(100) NOT NULL,
  `contact_external_id` varchar(100) NOT NULL,
  `contact_name` varchar(190) NOT NULL,
  `contact_mobile` varchar(20) NOT NULL,
  `contact_city` varchar(120) DEFAULT NULL,
  `branch_id` varchar(100) NOT NULL,
  `branch_name` varchar(190) NOT NULL,
  `branch_area` varchar(190) DEFAULT NULL,
  `branch_city` varchar(120) DEFAULT NULL,
  `branch_address` varchar(500) DEFAULT NULL,
  `visit_date` date NOT NULL,
  `visit_time` time NOT NULL,
  `visit_timezone` varchar(100) NOT NULL,
  `visit_at_utc` datetime NOT NULL,
  `received_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contact_branch_visit_event` (`event_key`),
  KEY `idx_contact_branch_visit_branch` (`branch_id`,`visit_at_utc`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `contact_branch_visits` WRITE;
/*!40000 ALTER TABLE `contact_branch_visits` DISABLE KEYS */;
INSERT INTO `contact_branch_visits` VALUES
(1,'22a4fa68f1f682610c7b0c311e875b11b940118b80b5e65254029478037090c1','contact.visiting_branch','visiting_branch','9999001','Webhook Verification','9117125555','Bengaluru','AGPL001','Malleswaram','Malleswaram','Bengaluru','No.353/1, 2nd Floor, 10th Cross, Sampige Road','2026-10-28','12:00:00','Asia/Kolkata','2026-10-28 06:30:00','2026-10-27 06:57:40'),
(2,'a7cf329a8fc232a4e893648549e9dbfa3484824bf5b13e2691a1b5a1f0fb7b47','contact.visiting_branch','visiting_branch','9999002','Webhook Verification AGBPL002','9117125555','Bengaluru','AGBPL002','AGBPL002',NULL,'Bengaluru',NULL,'2026-10-28','12:15:00','Asia/Kolkata','2026-10-28 06:45:00','2026-10-27 06:58:25'),
(3,'054e20014e3fba6ed50071438940b25f62e239eea3a646f20dec9574290177f2','contact.visiting_branch','visiting_branch','32','Test','6454556344','Shimoga','AGPL002','White Field','Whitefield Main Road','Bengaluru','#2 1st floor Mayuri Bakery Lane , Immidihalli Main road whitefield. opposite masjid Near towards Marthahalli bmtc bus stop','2026-10-27','13:32:00','Asia/Kolkata','2026-10-27 08:02:00','2026-10-27 07:01:58'),
(4,'4200a7b4428a148712509453e22eeccbbbfcbe9232b1eed4898313aa8f7d56f7','contact.visiting_branch','visiting_branch','12','abhi rock','7619600388',NULL,'AGBPL002','Jayanagar','Jayanagar','Bengaluru','No.480 / 17,  45th Crosss, 8th Block, Jayanagar, Bengaluru, 560070','2026-10-27','13:20:00','Asia/Kolkata','2026-10-27 07:50:00','2026-10-27 07:07:58'),
(5,'16d29f2d5342e771b0d7ad287828e6ad11389ff099c794acc71a6442836771b4','contact.visiting_branch','visiting_branch','8','Popup Deployment Test','9123456780',NULL,'AGBPL002','Jayanagar','Jayanagar','Bengaluru','No.480 / 17,  45th Crosss, 8th Block, Jayanagar, Bengaluru, 560070','2026-10-27','13:10:00','Asia/Kolkata','2026-10-27 07:40:00','2026-10-27 07:09:48');
/*!40000 ALTER TABLE `contact_branch_visits` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customer_verification_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_verification_photos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `request_id` bigint(20) unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `captured_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_verification_photos_request` (`request_id`,`id`),
  CONSTRAINT `fk_verification_photo_request` FOREIGN KEY (`request_id`) REFERENCES `customer_verification_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer_verification_photos` WRITE;
/*!40000 ALTER TABLE `customer_verification_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_verification_photos` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customer_verification_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_verification_references` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `request_id` bigint(20) unsigned NOT NULL,
  `name` varchar(190) NOT NULL,
  `relationship` varchar(120) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_verification_references_request` (`request_id`,`id`),
  CONSTRAINT `fk_verification_reference_request` FOREIGN KEY (`request_id`) REFERENCES `customer_verification_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer_verification_references` WRITE;
/*!40000 ALTER TABLE `customer_verification_references` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_verification_references` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customer_verification_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_verification_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `te_user_id` int(10) unsigned NOT NULL,
  `branch_id` varchar(100) NOT NULL,
  `branch_name` varchar(190) NOT NULL,
  `bm_employee_id` varchar(100) NOT NULL,
  `bm_name` varchar(190) NOT NULL,
  `bm_phone` varchar(20) NOT NULL,
  `request_notes` varchar(1000) DEFAULT NULL,
  `status` enum('assigned','in_progress','verified','could_not_verify') NOT NULL DEFAULT 'assigned',
  `authentication_person_name` varchar(190) DEFAULT NULL,
  `authentication_person_relationship` varchar(120) DEFAULT NULL,
  `authentication_person_phone` varchar(20) DEFAULT NULL,
  `verification_notes` varchar(2000) DEFAULT NULL,
  `failure_reason` varchar(1000) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_verification_te_status` (`te_user_id`,`status`,`assigned_at`),
  KEY `idx_verification_customer` (`company_id`,`customer_id`,`assigned_at`),
  KEY `idx_verification_branch` (`branch_id`,`bm_employee_id`,`assigned_at`),
  KEY `fk_verification_customer` (`customer_id`),
  CONSTRAINT `fk_verification_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_verification_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_verification_te` FOREIGN KEY (`te_user_id`) REFERENCES `te_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer_verification_requests` WRITE;
/*!40000 ALTER TABLE `customer_verification_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_verification_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customer_verification_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_verification_videos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `request_id` bigint(20) unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL DEFAULT 'video/mp4',
  `duration_ms` int(10) unsigned NOT NULL,
  `byte_size` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `captured_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_verification_video_request` (`request_id`),
  CONSTRAINT `fk_verification_video_request` FOREIGN KEY (`request_id`) REFERENCES `customer_verification_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer_verification_videos` WRITE;
/*!40000 ALTER TABLE `customer_verification_videos` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_verification_videos` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customer_workflow_outcomes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_workflow_outcomes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `branch_id` varchar(100) NOT NULL,
  `outcome_date` date NOT NULL,
  `status` enum('not_billed') NOT NULL,
  `source` enum('send_report','branch_closing') NOT NULL,
  `marked_by_employee_id` varchar(100) NOT NULL,
  `marked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_workflow_outcome` (`customer_id`,`outcome_date`,`status`),
  KEY `idx_customer_workflow_branch` (`company_id`,`branch_id`,`outcome_date`,`status`),
  CONSTRAINT `fk_customer_workflow_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_customer_workflow_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer_workflow_outcomes` WRITE;
/*!40000 ALTER TABLE `customer_workflow_outcomes` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_workflow_outcomes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `phone` char(10) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(190) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `gstin` varchar(15) DEFAULT NULL,
  `state_code` char(2) DEFAULT NULL,
  `place_of_supply` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `customer_image_path` varchar(255) DEFAULT NULL,
  `employer_name` varchar(190) DEFAULT NULL,
  `employer_address` varchar(500) DEFAULT NULL,
  `employment_designation` varchar(120) DEFAULT NULL,
  `company_id_card_path` varchar(255) DEFAULT NULL,
  `company_id_card_original_name` varchar(255) DEFAULT NULL,
  `company_id_card_mime_type` varchar(100) DEFAULT NULL,
  `old_gold_wearing_image_path` varchar(255) DEFAULT NULL,
  `old_gold_wearing_image_original_name` varchar(255) DEFAULT NULL,
  `old_gold_wearing_image_mime_type` varchar(100) DEFAULT NULL,
  `recommendation_name` varchar(190) DEFAULT NULL,
  `recommendation_relationship` varchar(120) DEFAULT NULL,
  `recommendation_phone` varchar(20) DEFAULT NULL,
  `recommendation_address` varchar(500) DEFAULT NULL,
  `origin_branch_id` varchar(100) DEFAULT NULL,
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_company_phone` (`company_id`,`phone`),
  KEY `idx_customer_company_name` (`company_id`,`name`),
  KEY `fk_customer_admin` (`created_by`),
  CONSTRAINT `fk_customer_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_customer_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES
(17,1,'9739582882','Agasthya S','swastikenterprises3456@gmail.com','#206, 11th cross Telecom Layout, Vijayanagar, Bangalore North','bangalore','Karnataka',NULL,'29','Karnataka','560040',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-09-22 11:01:30','2026-09-22 11:01:30'),
(21,1,'9876543210','Attica VK',NULL,'1, 4th floor',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'AGBPL002','10001',NULL,'2026-10-23 07:56:37','2026-10-23 07:56:37'),
(22,1,'8861607760','Kalpana',NULL,'W/O Shivarajejgowda, Bananakere, Baddikere PO, Nuggehalli Hobli, Channarayapatna, Hassan','Bengaluru','Karnataka',NULL,'29','Karnataka','573131',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Shivarajejgowda','Husband','9845856368','Bananakere, Baddikere PO, Nuggehalli Hobli, Channarayapatna, Hassan',NULL,NULL,1,'2026-10-24 10:43:10','2026-10-24 10:43:10'),
(23,1,'3582763619','thousif kamal','thousif@aryangold.in','amsdasd asjdjhakjshd asdasd asdasd,aasd, asd 23asd,asda','bengaluru','Karnataka',NULL,'29','Karnataka','560085','1/02accbf538f825d2b7b2703c92c064130c237a33.jpg','dgfdhgfgf','19, Cunningham Rd\r\nKathrikadavu, Vasanth Nagar','branch manager','1/037405a4b78978fda5b253b73cecf9129b8b7903.jpg','Technical Floor Plan with Switch Box Dimensions.jpg','image/jpeg','1/b32b0249e2130b47a94ae771920158d5ea468820.jpg','vd_team_ac_wall_labeled.jpg','image/jpeg','manoj r','friend','7687628763','aaksdh, dadsd,asd adasd, 2342sdfsdf, asdasd 2347273',NULL,NULL,1,'2026-11-04 09:56:27','2026-11-04 09:56:27');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `fund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `requested_amount_paise` bigint(20) unsigned NOT NULL,
  `approved_amount_paise` bigint(20) unsigned DEFAULT NULL,
  `purpose` varchar(500) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_by_employee_id` varchar(100) NOT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `admin_notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_fund_requests_review` (`status`,`created_at`),
  KEY `idx_fund_requests_branch` (`branch_id`,`created_at`),
  KEY `fk_fund_request_admin` (`reviewed_by`),
  CONSTRAINT `fk_fund_request_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `fund_requests` WRITE;
/*!40000 ALTER TABLE `fund_requests` DISABLE KEYS */;
INSERT INTO `fund_requests` VALUES
(1,'AGBPL002',10000000,10000000,'branch running','approved','10001',1,'2026-10-15 06:15:35',NULL,'2026-10-15 06:15:24','2026-10-15 06:15:35');
/*!40000 ALTER TABLE `fund_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `gatti_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `gatti_sales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `melt_group_id` bigint(20) unsigned NOT NULL,
  `sale_date` date NOT NULL,
  `sale_rate_paise_per_gram` bigint(20) unsigned NOT NULL,
  `sold_to` varchar(190) NOT NULL,
  `sale_amount_paise` bigint(20) unsigned NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gatti_sales_melt_group` (`melt_group_id`),
  KEY `idx_gatti_sales_date` (`sale_date`),
  KEY `fk_gatti_sale_admin` (`created_by`),
  CONSTRAINT `fk_gatti_sale_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_gatti_sale_melt_group` FOREIGN KEY (`melt_group_id`) REFERENCES `melt_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `gatti_sales` WRITE;
/*!40000 ALTER TABLE `gatti_sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `gatti_sales` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `head_office_ornament_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `head_office_ornament_audits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_item_id` bigint(20) unsigned NOT NULL,
  `status` enum('audited','grouped') NOT NULL DEFAULT 'audited',
  `audited_weight_mg` bigint(20) unsigned NOT NULL,
  `received_by` int(10) unsigned NOT NULL,
  `audited_by` int(10) unsigned NOT NULL,
  `received_at` datetime NOT NULL,
  `audited_at` datetime NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ornament_audit_transfer_item` (`transfer_item_id`),
  KEY `idx_ornament_audits_status` (`status`,`audited_at`),
  KEY `fk_ornament_audit_received_user` (`received_by`),
  KEY `fk_ornament_audit_audited_user` (`audited_by`),
  CONSTRAINT `fk_ornament_audit_audited_user` FOREIGN KEY (`audited_by`) REFERENCES `head_office_users` (`id`),
  CONSTRAINT `fk_ornament_audit_item` FOREIGN KEY (`transfer_item_id`) REFERENCES `branch_gold_transfer_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ornament_audit_received_user` FOREIGN KEY (`received_by`) REFERENCES `head_office_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `head_office_ornament_audits` WRITE;
/*!40000 ALTER TABLE `head_office_ornament_audits` DISABLE KEYS */;
/*!40000 ALTER TABLE `head_office_ornament_audits` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `head_office_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `head_office_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_head_office_session_token` (`token_hash`),
  KEY `idx_head_office_sessions_expiry` (`expires_at`),
  KEY `fk_head_office_session_user` (`user_id`),
  CONSTRAINT `fk_head_office_session_user` FOREIGN KEY (`user_id`) REFERENCES `head_office_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `head_office_sessions` WRITE;
/*!40000 ALTER TABLE `head_office_sessions` DISABLE KEYS */;
-- Rows from head_office_sessions were removed from the public demo snapshot.
/*!40000 ALTER TABLE `head_office_sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `head_office_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `head_office_users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `name` varchar(190) NOT NULL,
  `role` enum('auditor','melter','floor') NOT NULL,
  `operations_admin_id` int(10) unsigned DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_head_office_username` (`username`),
  KEY `fk_head_office_operations_admin` (`operations_admin_id`),
  CONSTRAINT `fk_head_office_operations_admin` FOREIGN KEY (`operations_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `head_office_users` WRITE;
/*!40000 ALTER TABLE `head_office_users` DISABLE KEYS */;
INSERT INTO `head_office_users` VALUES
(1,'auditor','Head Office Auditor','auditor',NULL,'!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',1,'2026-10-14 11:31:32','2026-10-19 09:43:25'),
(2,'melter','Head Office Melter','melter',NULL,'!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',1,'2026-10-14 11:31:32','2026-10-19 09:43:25'),
(3,'floor','Floor Operations User','floor',2,'!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',1,'2026-10-14 11:31:32','2026-10-19 09:43:25');
/*!40000 ALTER TABLE `head_office_users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `internal_stock_transfer_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `internal_stock_transfer_sequences` (
  `branch_id` varchar(100) NOT NULL,
  `transfer_date` date NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`branch_id`,`transfer_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `internal_stock_transfer_sequences` WRITE;
/*!40000 ALTER TABLE `internal_stock_transfer_sequences` DISABLE KEYS */;
INSERT INTO `internal_stock_transfer_sequences` VALUES
('AGBPL002','2026-11-04',2);
/*!40000 ALTER TABLE `internal_stock_transfer_sequences` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `invoice_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_sequences` (
  `company_id` int(10) unsigned NOT NULL,
  `state_code` char(2) NOT NULL DEFAULT 'KA',
  `invoice_year` smallint(5) unsigned NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`company_id`,`state_code`,`invoice_year`),
  CONSTRAINT `fk_sequence_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `invoice_sequences` WRITE;
/*!40000 ALTER TABLE `invoice_sequences` DISABLE KEYS */;
INSERT INTO `invoice_sequences` VALUES
(1,'KA',2026,3),
(1,'TN',2026,0),
(2,'KA',2026,5),
(3,'KA',2026,1);
/*!40000 ALTER TABLE `invoice_sequences` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `kyc_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kyc_records` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `company_id` int(10) unsigned NOT NULL,
  `document_type` enum('aadhaar','pan') NOT NULL,
  `number_encrypted` text NOT NULL,
  `number_hash` char(64) NOT NULL,
  `number_last4` char(4) NOT NULL,
  `document_path` varchar(255) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kyc_company_type_hash` (`company_id`,`document_type`,`number_hash`),
  KEY `idx_kyc_company_customer` (`company_id`,`customer_id`),
  KEY `fk_kyc_customer` (`customer_id`),
  KEY `fk_kyc_admin` (`created_by`),
  CONSTRAINT `fk_kyc_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_kyc_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_kyc_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `kyc_records` WRITE;
/*!40000 ALTER TABLE `kyc_records` DISABLE KEYS */;
INSERT INTO `kyc_records` VALUES
(30,17,1,'aadhaar','Uz5ojqcKDuRhGY-h.e2EZVGKFz0rh6HPfYDy83g.pg6povA6Vellt_AS','00ee43453d98dda7a2bda22c6fe590f5922a9b9d767bc88a53ee87173a931fcf','2085',NULL,'',NULL,0,NULL,1,'2026-09-22 11:01:30'),
(34,22,1,'aadhaar','ym1UkDTTLiwtvJXK.FBoucLMVQWaqN1NpHSTAKA._ip8Dj-R-qWJAFcf','693899dc5fc2f67ac7eafcce8d5f63f79c8e61bcba746792e6a25c4cd662c09c','7811',NULL,'',NULL,0,NULL,1,'2026-10-24 10:43:10'),
(35,23,1,'pan','M3qnYc6OMqgu-tlO.kPz7ERfHRTk-cUIvJB0ToQ.5XqS0WwoGQeixw','c01f11d79b4e3a26708033610ea7e633cfe6890ee76bae1c0684e0be0bd4b753','287K','1/65de949df12fd46173869af8aedb40f08ea038f4.jpg','Corridor Wall Measurement Plan.jpg','image/jpeg',0,NULL,1,'2026-11-04 09:56:27');
/*!40000 ALTER TABLE `kyc_records` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `melt_daily_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `melt_daily_sequences` (
  `melt_date` date NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`melt_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `melt_daily_sequences` WRITE;
/*!40000 ALTER TABLE `melt_daily_sequences` DISABLE KEYS */;
/*!40000 ALTER TABLE `melt_daily_sequences` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `melt_group_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `melt_group_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `melt_group_id` bigint(20) unsigned NOT NULL,
  `transfer_item_id` bigint(20) unsigned NOT NULL,
  `audited_weight_mg` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_melt_group_transfer_item` (`transfer_item_id`),
  KEY `idx_melt_group_items_group` (`melt_group_id`),
  CONSTRAINT `fk_melt_group_item_group` FOREIGN KEY (`melt_group_id`) REFERENCES `melt_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_melt_group_item_transfer` FOREIGN KEY (`transfer_item_id`) REFERENCES `branch_gold_transfer_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `melt_group_items` WRITE;
/*!40000 ALTER TABLE `melt_group_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `melt_group_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `melt_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `melt_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `gatti_id` varchar(40) NOT NULL,
  `melt_date` date NOT NULL,
  `status` enum('created','completed') NOT NULL DEFAULT 'created',
  `audited_total_weight_mg` bigint(20) unsigned NOT NULL,
  `input_weight_mg` bigint(20) unsigned DEFAULT NULL,
  `output_gatti_weight_mg` bigint(20) unsigned DEFAULT NULL,
  `matti_weight_mg` bigint(20) unsigned DEFAULT NULL,
  `purity` decimal(6,3) DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `melter_notes` varchar(1000) DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `completed_by` int(10) unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_melt_group_gatti_id` (`gatti_id`),
  KEY `idx_melt_groups_date_status` (`melt_date`,`status`),
  KEY `fk_melt_group_creator` (`created_by`),
  KEY `fk_melt_group_completer` (`completed_by`),
  CONSTRAINT `fk_melt_group_completer` FOREIGN KEY (`completed_by`) REFERENCES `head_office_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_melt_group_creator` FOREIGN KEY (`created_by`) REFERENCES `head_office_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `melt_groups` WRITE;
/*!40000 ALTER TABLE `melt_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `melt_groups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quotation_id` bigint(20) unsigned NOT NULL,
  `description` varchar(190) NOT NULL,
  `purity` varchar(30) NOT NULL,
  `gross_weight_mg` bigint(20) unsigned NOT NULL DEFAULT 0,
  `stone_weight_mg` bigint(20) unsigned NOT NULL DEFAULT 0,
  `wastage_weight_mg` bigint(20) unsigned NOT NULL DEFAULT 0,
  `weight_mg` bigint(20) unsigned NOT NULL,
  `rate_paise_per_gram` bigint(20) unsigned NOT NULL,
  `amount_paise` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_quotation_items_quotation` (`quotation_id`),
  CONSTRAINT `fk_quotation_item_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
INSERT INTO `quotation_items` VALUES
(1,1,'Ring','22K / 916',5800,0,0,5800,1300000,7540000),
(2,2,'Bangle','22K / 916',15000,5000,2000,8000,1300000,10400000),
(3,3,'Bangle','22K / 916',15000,5000,2000,8000,1300000,10400000),
(4,3,'Ring','24K / 999',14000,4000,2000,8000,1450000,11600000),
(5,4,'Chain','18K / 750',41800,2000,0,39800,1050000,41790000);
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `quotation_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_sequences` (
  `company_id` int(10) unsigned NOT NULL,
  `quotation_year` smallint(5) unsigned NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`company_id`,`quotation_year`),
  CONSTRAINT `fk_quotation_sequence_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `quotation_sequences` WRITE;
/*!40000 ALTER TABLE `quotation_sequences` DISABLE KEYS */;
INSERT INTO `quotation_sequences` VALUES
(1,2026,4);
/*!40000 ALTER TABLE `quotation_sequences` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `quotation_number` varchar(50) NOT NULL,
  `business_mode` enum('walkin','pledged') NOT NULL DEFAULT 'walkin',
  `total_weight_mg` bigint(20) unsigned NOT NULL,
  `total_paise` bigint(20) unsigned NOT NULL,
  `pledge_amount_paise` bigint(20) unsigned DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `origin_branch_id` varchar(100) DEFAULT NULL,
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quotation_company_number` (`company_id`,`quotation_number`),
  KEY `idx_quotation_company_created` (`company_id`,`created_at`),
  KEY `idx_quotation_customer` (`customer_id`,`created_at`),
  KEY `fk_quotation_admin` (`created_by`),
  CONSTRAINT `fk_quotation_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_quotation_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_quotation_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
INSERT INTO `quotations` VALUES
(1,1,21,'AG/QTN/2026/0001','walkin',5800,7540000,NULL,NULL,'AGBPL002','10001',NULL,'2026-10-23 09:37:30'),
(2,1,21,'AG/QTN/2026/0002','walkin',8000,10400000,NULL,NULL,'AGBPL002','10001',NULL,'2026-10-23 09:51:16'),
(3,1,21,'AG/QTN/2026/0003','walkin',16000,22000000,NULL,NULL,'AGBPL002','10001',NULL,'2026-10-23 09:52:18'),
(4,1,22,'AG/QTN/2026/0004','walkin',39800,41790000,NULL,NULL,NULL,NULL,1,'2026-10-24 10:45:50');
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `admin_id` int(10) unsigned NOT NULL,
  `company_id` int(10) unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token` (`token_hash`),
  KEY `idx_sessions_expiry` (`expires_at`),
  KEY `fk_sessions_admin` (`admin_id`),
  KEY `fk_sessions_company` (`company_id`),
  CONSTRAINT `fk_sessions_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sessions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
-- Rows from sessions were removed from the public demo snapshot.
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `metal` enum('gold','silver') NOT NULL,
  `movement` enum('add','remove') NOT NULL,
  `weight_mg` bigint(20) unsigned NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_stock_company_date` (`company_id`,`created_at`),
  KEY `fk_stock_admin` (`created_by`),
  CONSTRAINT `fk_stock_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_stock_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `te_device_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `te_device_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `te_user_id` int(10) unsigned NOT NULL,
  `device_token` varchar(512) NOT NULL,
  `platform` varchar(30) NOT NULL DEFAULT 'android',
  `last_seen_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_te_device_token` (`device_token`(190)),
  KEY `idx_te_device_user` (`te_user_id`,`last_seen_at`),
  CONSTRAINT `fk_te_device_user` FOREIGN KEY (`te_user_id`) REFERENCES `te_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `te_device_tokens` WRITE;
/*!40000 ALTER TABLE `te_device_tokens` DISABLE KEYS */;
-- Rows from te_device_tokens were removed from the public demo snapshot.
/*!40000 ALTER TABLE `te_device_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `te_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `te_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `te_user_id` int(10) unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_te_sessions_token` (`token_hash`),
  KEY `idx_te_sessions_expiry` (`expires_at`),
  KEY `fk_te_session_user` (`te_user_id`),
  CONSTRAINT `fk_te_session_user` FOREIGN KEY (`te_user_id`) REFERENCES `te_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `te_sessions` WRITE;
/*!40000 ALTER TABLE `te_sessions` DISABLE KEYS */;
-- Rows from te_sessions were removed from the public demo snapshot.
/*!40000 ALTER TABLE `te_sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `te_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `te_users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) NOT NULL,
  `name` varchar(190) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_te_users_user_id` (`user_id`),
  KEY `fk_te_user_admin` (`created_by`),
  CONSTRAINT `fk_te_user_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `te_users` WRITE;
/*!40000 ALTER TABLE `te_users` DISABLE KEYS */;
INSERT INTO `te_users` VALUES
(1,'20001','TE 20001',NULL,'!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!',1,1,'2026-10-19 09:46:22','2026-10-19 09:46:22');
/*!40000 ALTER TABLE `te_users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `verification_result_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_result_views` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `request_id` bigint(20) unsigned NOT NULL,
  `viewer_role` enum('admin','floor','branch') NOT NULL,
  `viewer_key` varchar(120) NOT NULL,
  `viewed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_verification_viewer` (`request_id`,`viewer_role`,`viewer_key`),
  KEY `idx_verification_views_request` (`request_id`,`viewed_at`),
  CONSTRAINT `fk_verification_view_request` FOREIGN KEY (`request_id`) REFERENCES `customer_verification_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `verification_result_views` WRITE;
/*!40000 ALTER TABLE `verification_result_views` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_result_views` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
