-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: aj_dev
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

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

--
-- Current Database: `aj_dev`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `aj_dev` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `aj_dev`;

--
-- Table structure for table `accounts_sessions`
--

DROP TABLE IF EXISTS `accounts_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_sessions`
--

LOCK TABLES `accounts_sessions` WRITE;
/*!40000 ALTER TABLE `accounts_sessions` DISABLE KEYS */;
INSERT INTO `accounts_sessions` VALUES (10,'f47cc8575f9b7f90ed942ce2a9ce2cfdf567e744257ad12ef45a5bb9c336ec5b',1,'2026-10-10 22:50:04','2026-10-10 10:50:04'),(11,'844d5f5af91992aade8444fb0e87914d56494079e1e7d882f7c43c92e704281b',1,'2026-10-10 22:50:13','2026-10-10 10:50:13');
/*!40000 ALTER TABLE `accounts_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_users`
--

DROP TABLE IF EXISTS `accounts_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_users`
--

LOCK TABLES `accounts_users` WRITE;
/*!40000 ALTER TABLE `accounts_users` DISABLE KEYS */;
INSERT INTO `accounts_users` VALUES (1,'accounts','Accounts Executive','e5801fafed68a4d9b250b1dc602ac6c5:77e0e90b0b017cda1064abbe206c640103958485b853305c9bf127954aef98e92d5d47911aae14ef14f482327131264a028286d17c34b51866963ff198003f67',1,'2026-10-07 09:37:48','2026-10-07 10:54:32');
/*!40000 ALTER TABLE `accounts_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_company_access`
--

DROP TABLE IF EXISTS `admin_company_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_company_access` (
  `admin_id` int(10) unsigned NOT NULL,
  `company_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`admin_id`,`company_id`),
  KEY `fk_access_company` (`company_id`),
  CONSTRAINT `fk_access_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_company_access`
--

LOCK TABLES `admin_company_access` WRITE;
/*!40000 ALTER TABLE `admin_company_access` DISABLE KEYS */;
INSERT INTO `admin_company_access` VALUES (1,1),(1,2),(1,3);
/*!40000 ALTER TABLE `admin_company_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'admin@aryangold.in','Aryan Gold Administrator','3819c6125e53e3f1235b8a85ab9f7ae4:771933db95c703dde2397cf2fae128b759fb09515cae26f13c6bedda1bb87952fb097f3520035efee82c1fba788f57b33dfa27dcc40ac93705ef9426b9b36930',1,'2026-10-05 09:40:20','2026-10-07 10:54:32'),(2,'floor-user@internal.aryangold','Floor Operations User','9362e7ca5c5276ed5b968fed8ac40c13:efe44211bbf3a4ce7f4b22f3ad0f58595ec3a8c27b924403130318fbd34d1638014499ba4844c17197ba612ecf788c45a795f8fcf889f26ba464fa128962c68c',0,'2026-10-10 07:31:35','2026-10-10 07:31:35');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,2,'login',NULL,NULL,'127.0.0.1','2026-10-05 09:41:56'),(2,1,2,'login',NULL,NULL,'127.0.0.1','2026-10-05 09:44:48'),(3,1,2,'logout',NULL,NULL,NULL,'2026-10-05 09:48:11'),(4,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-06 06:36:05'),(5,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-06 07:12:06'),(6,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-06 07:15:02'),(7,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-06 07:17:39'),(8,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-06 07:27:44'),(9,1,1,'fund_approved','fund',1,NULL,'2026-10-06 07:39:01'),(16,NULL,1,'customer_created','customer',4,'127.0.0.1','2026-10-06 08:22:56'),(19,1,1,'login',NULL,NULL,'::1','2026-10-06 10:40:21'),(20,NULL,1,'bill_created','bill',6,'::1','2026-10-06 12:48:06'),(21,1,1,'transaction_billed','transaction',6,NULL,'2026-10-06 12:48:38'),(22,1,1,'login',NULL,NULL,'::1','2026-10-07 05:37:18'),(23,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-07 06:18:53'),(24,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-07 06:20:11'),(25,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:28:55'),(26,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:36:03'),(27,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:38:08'),(28,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:39:05'),(29,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:39:44'),(30,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:40:35'),(31,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 06:42:55'),(32,1,1,'employee_branch_assigned','attendance_employee',NULL,NULL,'2026-10-07 06:42:55'),(33,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 06:45:50'),(34,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 07:08:45'),(35,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 07:14:10'),(36,NULL,1,'bill_created','bill',7,'127.0.0.1','2026-10-07 07:15:02'),(37,1,1,'transaction_billed','transaction',7,NULL,'2026-10-07 07:38:16'),(38,NULL,1,'bill_created','bill',8,'127.0.0.1','2026-10-07 07:39:34'),(39,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:17:31'),(40,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:19:00'),(41,1,1,'transaction_rejected','transaction',8,NULL,'2026-10-07 08:45:58'),(42,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:50:50'),(43,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:50:59'),(44,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:51:11'),(45,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:51:20'),(46,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:51:33'),(47,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 08:51:43'),(48,NULL,1,'bill_created','bill',10,'127.0.0.1','2026-10-07 09:21:20'),(49,1,1,'transaction_billed','transaction',10,NULL,'2026-10-07 09:22:06'),(50,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 09:39:19'),(51,1,1,'login',NULL,NULL,'127.0.0.1','2026-10-07 09:40:22'),(52,NULL,1,'bill_created','bill',11,'::1','2026-10-07 10:15:22'),(53,1,1,'transaction_billed','transaction',11,NULL,'2026-10-07 10:38:11'),(54,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-07 10:53:31'),(55,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-07 10:54:31'),(56,1,1,'password_changed','admin',NULL,'::ffff:127.0.0.1','2026-10-07 10:54:31'),(57,1,1,'password_changed','admin',NULL,'::ffff:127.0.0.1','2026-10-07 10:54:32'),(58,1,1,'login',NULL,NULL,'::1','2026-10-07 11:44:27'),(59,NULL,1,'bill_created','bill',12,'::1','2026-10-07 11:49:57'),(60,1,1,'transaction_billed','transaction',12,NULL,'2026-10-07 11:50:31'),(61,1,1,'report_xlsx_downloaded','report',NULL,'::1','2026-10-07 12:03:40'),(62,1,1,'login',NULL,NULL,'::1','2026-10-10 04:59:41'),(63,1,1,'login',NULL,NULL,'::1','2026-10-10 05:00:18'),(64,1,1,'login',NULL,NULL,'::1','2026-10-10 07:18:07'),(65,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-10 07:35:58'),(66,1,1,'login',NULL,NULL,'::1','2026-10-10 07:49:06'),(67,1,1,'login',NULL,NULL,'::1','2026-10-10 07:49:40'),(68,1,1,'login',NULL,NULL,'::1','2026-10-10 07:49:46'),(69,1,1,'login',NULL,NULL,'::1','2026-10-10 07:50:06'),(71,1,1,'gatti_sale_created','gatti_sale',4,'::1','2026-10-10 08:04:31'),(72,1,1,'gatti_sale_created','gatti_sale',5,'::1','2026-10-10 08:04:48'),(73,1,1,'login',NULL,NULL,'::1','2026-10-10 09:50:01'),(74,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-10 10:50:03'),(75,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-10 10:50:13'),(76,1,1,'login',NULL,NULL,'::ffff:127.0.0.1','2026-10-10 11:40:08');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_items`
--

DROP TABLE IF EXISTS `bill_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_items`
--

LOCK TABLES `bill_items` WRITE;
/*!40000 ALTER TABLE `bill_items` DISABLE KEYS */;
INSERT INTO `bill_items` VALUES (6,6,'Gold Ornament','ring, chain','711319','24K / 999','gold',10000,2000,8000,1480000,0,11840000),(7,7,'Gold Ornament','ring x 2, chain','711319','24K / 999','gold',15000,2000,13000,1480000,-40000,19200000),(8,8,'Gold Ornament','2 chains','711319','24K / 999','gold',35000,15000,20000,1480000,0,29600000),(10,10,'Gold Ornament','ring','711319','24K / 999','gold',60000,5000,55000,1480000,0,81400000),(11,11,'Gold Ornament','rings','711319','24K / 999','gold',15000,5000,10000,1480000,0,14800000),(12,12,'Gold Ornament','ring','711319','24K / 999','gold',2000,1500,500,1480000,0,740000);
/*!40000 ALTER TABLE `bill_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_payments`
--

DROP TABLE IF EXISTS `bill_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_payments`
--

LOCK TABLES `bill_payments` WRITE;
/*!40000 ALTER TABLE `bill_payments` DISABLE KEYS */;
INSERT INTO `bill_payments` VALUES (2,10,'cash',15000000,NULL,NULL,NULL,NULL,'not_required',NULL,NULL,NULL,'2026-10-07 09:21:20'),(3,10,'upi',66400000,'vkvinay580@paytm',NULL,NULL,NULL,'paid','5436587JHJGJ',1,'2026-10-07 10:21:28','2026-10-07 09:21:20'),(4,11,'cash',3500000,NULL,NULL,NULL,NULL,'not_required',NULL,NULL,NULL,'2026-10-07 10:15:22'),(5,11,'bank_transfer',11300000,'A/C ••••7889 · KARN0000088','zYTUpIEEBeJlVQY7.OEyzUAAX5qDzZ02seOU1gQ.vHwnVRnTFpRyaok','KARN0000088',NULL,'paid','QWERTYU445678',1,'2026-10-07 10:38:23','2026-10-07 10:15:22'),(6,12,'cash',350000,NULL,NULL,NULL,NULL,'not_required',NULL,NULL,NULL,'2026-10-07 11:49:57'),(7,12,'upi',390000,'vinyfyf@paytm',NULL,NULL,'vinyfyf@paytm','paid','098345SKDKJFHSDKFKJ',1,'2026-10-07 11:52:31','2026-10-07 11:49:57');
/*!40000 ALTER TABLE `bill_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bills`
--

DROP TABLE IF EXISTS `bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `account_number` text DEFAULT NULL,
  `ifsc_code` varchar(11) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `cheque_number` varchar(20) DEFAULT NULL,
  `card_number` text DEFAULT NULL,
  `ornament_image_path` varchar(255) DEFAULT NULL,
  `signature_image_path` varchar(255) DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `release_place` varchar(190) DEFAULT NULL,
  `release_amount_paise` bigint(20) unsigned DEFAULT NULL,
  `origin_branch_id` varchar(100) DEFAULT NULL,
  `created_by_employee_id` varchar(100) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bill_company_number` (`company_id`,`bill_number`),
  KEY `idx_bill_company_date` (`company_id`,`bill_date`),
  KEY `fk_bill_customer` (`customer_id`),
  KEY `fk_bill_admin` (`created_by`),
  CONSTRAINT `fk_bill_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_bill_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_bill_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bills`
--

LOCK TABLES `bills` WRITE;
/*!40000 ALTER TABLE `bills` DISABLE KEYS */;
INSERT INTO `bills` VALUES (6,1,4,'AG/2627/06','purchase','2026-10-06',11840000,0,0,0,0,0,0,11840000,'cash',NULL,NULL,NULL,NULL,NULL,'1/0aaff7d0bd3a955e20cb7506a6ef5ecdfde01259.jpg','1/ec8aa5f49793a41258b7a60a9aefc56d9c8f38e4.jpg',NULL,'Test Finance Company',10000000,'AGBPL002','10003',NULL,'2026-10-06 12:48:06'),(7,1,4,'AG/2627/07','purchase','2026-10-07',19200000,0,0,0,0,0,0,19200000,'cash',NULL,NULL,NULL,NULL,NULL,'1/27cfa59e61cd8d9faba8ddded337effc31f3dc63.jpg','1/8dfd1d53a38ee31890bedb02f8f5c348e1021a76.jpg','hi hi test',NULL,NULL,'AGBPL002','10003',NULL,'2026-10-07 07:15:02'),(8,1,4,'AG/2627/08','purchase','2026-10-07',29600000,0,0,0,0,0,0,29600000,'cash',NULL,NULL,NULL,NULL,NULL,'1/7151317b11ddc72ef53d65069233d5b3b8a16ee4.jpg','1/477e564b9caaad0263d4400cdf5429ee41f1b63c.jpg',NULL,NULL,NULL,'AGBPL002','10003',NULL,'2026-10-07 07:39:34'),(10,1,4,'AG/2627/09','purchase','2026-10-07',81400000,0,0,0,0,0,0,81400000,'split',NULL,NULL,NULL,NULL,NULL,'1/e41c420b71ab0387231fcef5b68c5bc214c6fde3.jpg','1/988b1a1649972a3f50e394817523566fc4a27664.jpg',NULL,NULL,NULL,'AGBPL002','10003',NULL,'2026-10-07 09:21:20'),(11,1,4,'AG/2627/10','purchase','2026-10-07',14800000,0,0,0,0,0,0,14800000,'split',NULL,NULL,NULL,NULL,NULL,'1/a650c23eb6b6723d153a46a30184e0b4cc7976b1.jpg','1/e725e2a408f7b8209eb5ae4202e5279b6b0139a0.jpg',NULL,NULL,NULL,'AGBPL002','10003',NULL,'2026-10-07 10:15:22'),(12,1,4,'AG/2627/11','purchase','2026-10-07',740000,0,0,0,0,0,0,740000,'split',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'AGBPL002','10003',NULL,'2026-10-07 11:49:57');
/*!40000 ALTER TABLE `bills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_customers`
--

DROP TABLE IF EXISTS `branch_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_customers`
--

LOCK TABLES `branch_customers` WRITE;
/*!40000 ALTER TABLE `branch_customers` DISABLE KEYS */;
INSERT INTO `branch_customers` VALUES (4,'AGBPL002','vinay karthik','8765332111','akdhj aksjdh akjsjhda aksjhdasd akjhssd','10001','2026-10-06 08:22:56');
/*!40000 ALTER TABLE `branch_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_daily_closings`
--

DROP TABLE IF EXISTS `branch_daily_closings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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

--
-- Dumping data for table `branch_daily_closings`
--

LOCK TABLES `branch_daily_closings` WRITE;
/*!40000 ALTER TABLE `branch_daily_closings` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_daily_closings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_expenses`
--

DROP TABLE IF EXISTS `branch_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_expenses`
--

LOCK TABLES `branch_expenses` WRITE;
/*!40000 ALTER TABLE `branch_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_fund_ledger`
--

DROP TABLE IF EXISTS `branch_fund_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_fund_ledger`
--

LOCK TABLES `branch_fund_ledger` WRITE;
/*!40000 ALTER TABLE `branch_fund_ledger` DISABLE KEYS */;
INSERT INTO `branch_fund_ledger` VALUES (1,'AGBPL002','credit',50000000,'fund_request_approved',1,'Fund request approved',NULL,1,'2026-10-06 07:39:01'),(8,'AGBPL002','debit',10000000,'pledge_reserved',6,'Funds reserved for pledged gold','10001',NULL,'2026-10-06 09:29:55'),(9,'AGBPL002','debit',1840000,'purchase_billed',6,'Cash balance paid to customer for released pledge purchase',NULL,1,'2026-10-06 12:48:38'),(10,'AGBPL002','debit',19200000,'purchase_billed',7,'Cash paid for walk-in gold purchase',NULL,1,'2026-10-07 07:38:16'),(11,'AGBPL002','debit',15000000,'purchase_submitted',10,'Cash reserved for submitted purchase bill','10003',NULL,'2026-10-07 09:21:20'),(12,'AGBPL002','debit',3500000,'purchase_submitted',11,'Cash reserved for submitted purchase bill','10003',NULL,'2026-10-07 10:15:22'),(13,'AGBPL002','debit',350000,'purchase_submitted',12,'Cash reserved for submitted purchase bill','10003',NULL,'2026-10-07 11:49:57');
/*!40000 ALTER TABLE `branch_fund_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_gold_transfer_items`
--

DROP TABLE IF EXISTS `branch_gold_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_gold_transfer_items`
--

LOCK TABLES `branch_gold_transfer_items` WRITE;
/*!40000 ALTER TABLE `branch_gold_transfer_items` DISABLE KEYS */;
INSERT INTO `branch_gold_transfer_items` VALUES (1,1,6,6,6,8000,'2026-10-07 07:02:58'),(2,2,7,7,7,13000,'2026-10-07 10:39:30'),(3,2,10,10,10,55000,'2026-10-07 10:39:30'),(4,2,11,11,11,10000,'2026-10-07 10:39:30'),(5,3,12,12,12,500,'2026-10-07 11:53:32');
/*!40000 ALTER TABLE `branch_gold_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_gold_transfers`
--

DROP TABLE IF EXISTS `branch_gold_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_gold_transfers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(100) NOT NULL,
  `weight_mg` bigint(20) unsigned NOT NULL,
  `tare_weight_mg` bigint(20) unsigned NOT NULL DEFAULT 0,
  `bm_name` varchar(190) DEFAULT NULL,
  `bm_phone` varchar(20) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `status` enum('submitted','received','rejected') NOT NULL DEFAULT 'submitted',
  `created_by_employee_id` varchar(100) NOT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `admin_notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_branch_gold_transfer_review` (`status`,`created_at`),
  KEY `idx_branch_gold_transfer_branch` (`branch_id`,`created_at`),
  KEY `fk_branch_gold_transfer_admin` (`reviewed_by`),
  CONSTRAINT `fk_branch_gold_transfer_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_gold_transfers`
--

LOCK TABLES `branch_gold_transfers` WRITE;
/*!40000 ALTER TABLE `branch_gold_transfers` DISABLE KEYS */;
INSERT INTO `branch_gold_transfers` VALUES (1,'AGBPL002',8000,0,NULL,NULL,NULL,'received','10003',NULL,'2026-10-07 10:48:45',NULL,'2026-10-07 07:02:58','2026-10-07 10:48:45'),(2,'AGBPL002',78000,97000,'vk','8987987978','sequel done','received','10003',NULL,'2026-10-07 10:48:34',NULL,'2026-10-07 10:39:30','2026-10-07 10:48:34'),(3,'AGBPL002',500,5000,'sdfasd','3456767867','sql','received','10003',NULL,'2026-10-07 11:55:06',NULL,'2026-10-07 11:53:32','2026-10-07 11:55:06');
/*!40000 ALTER TABLE `branch_gold_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_pledge_documents`
--

DROP TABLE IF EXISTS `branch_pledge_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_pledge_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint(20) unsigned NOT NULL,
  `document_path` varchar(255) NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pledge_documents_transaction` (`transaction_id`),
  CONSTRAINT `fk_pledge_document_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `branch_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_pledge_documents`
--

LOCK TABLES `branch_pledge_documents` WRITE;
/*!40000 ALTER TABLE `branch_pledge_documents` DISABLE KEYS */;
INSERT INTO `branch_pledge_documents` VALUES (3,6,'storage/pledges/b77ba1db7d7ab04e2aaa25e2eb7c7c9efa690ae0.jpg','Logo.jpg','2026-10-06 09:29:55');
/*!40000 ALTER TABLE `branch_pledge_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_sessions`
--

DROP TABLE IF EXISTS `branch_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_sessions`
--

LOCK TABLES `branch_sessions` WRITE;
/*!40000 ALTER TABLE `branch_sessions` DISABLE KEYS */;
INSERT INTO `branch_sessions` VALUES (25,'fd0b27f23b0adddfbbb886e843f1c2d6308598454a7efd80e2d3ac6d829c9b36','AGBPL002','Adyar','10003','Adyar Employee','2026-10-07 23:46:10','2026-10-07 11:46:10');
/*!40000 ALTER TABLE `branch_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_stock_ledger`
--

DROP TABLE IF EXISTS `branch_stock_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_stock_ledger`
--

LOCK TABLES `branch_stock_ledger` WRITE;
/*!40000 ALTER TABLE `branch_stock_ledger` DISABLE KEYS */;
INSERT INTO `branch_stock_ledger` VALUES (1,'AGBPL002','in',8000,'purchase_billed',6,'Released pledge gold billed',NULL,1,'2026-10-06 12:48:38'),(2,'AGBPL002','out',8000,'ho_transfer_sent',1,'Gold sent to Head Office','10003',NULL,'2026-10-07 07:02:58'),(3,'AGBPL002','in',13000,'purchase_billed',7,'Walk-in gold purchase billed',NULL,1,'2026-10-07 07:38:16'),(4,'AGBPL002','in',55000,'purchase_billed',10,'Walk-in gold purchase billed',NULL,1,'2026-10-07 09:22:06'),(5,'AGBPL002','in',10000,'purchase_billed',11,'Walk-in gold purchase billed',NULL,1,'2026-10-07 10:38:11'),(6,'AGBPL002','out',78000,'ho_transfer_sent',2,'Gold sent to Head Office','10003',NULL,'2026-10-07 10:39:30'),(7,'AGBPL002','in',500,'purchase_billed',12,'Walk-in gold purchase billed',NULL,1,'2026-10-07 11:50:31'),(8,'AGBPL002','out',500,'ho_transfer_sent',3,'Gold sent to Head Office','10003',NULL,'2026-10-07 11:53:32');
/*!40000 ALTER TABLE `branch_stock_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_transactions`
--

DROP TABLE IF EXISTS `branch_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_transactions`
--

LOCK TABLES `branch_transactions` WRITE;
/*!40000 ALTER TABLE `branch_transactions` DISABLE KEYS */;
INSERT INTO `branch_transactions` VALUES (6,'AGBPL002',4,'purchase','pledged',8000,1480000,1840000,10000000,'Test Finance Company',10000000,NULL,NULL,'cash','{\"accountNumber\":null,\"ifscCode\":null,\"upiId\":null,\"chequeNumber\":null,\"cardNumber\":null}','released','2026-10-06 09:30:05',6,'Detailed bill AG/2627/06','billed','10001',1,'2026-10-06 12:48:38','2026-10-06 09:29:55','2026-10-06 12:48:38'),(7,'AGBPL002',4,'purchase','walkin',13000,1476923,19200000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,7,'Detailed bill AG/2627/07 · hi hi test','billed','10003',1,'2026-10-07 07:38:16','2026-10-07 07:15:02','2026-10-07 07:38:16'),(8,'AGBPL002',4,'purchase','walkin',20000,1480000,29600000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,8,'Detailed bill AG/2627/08','rejected','10003',1,'2026-10-07 08:45:58','2026-10-07 07:39:34','2026-10-07 08:45:58'),(10,'AGBPL002',4,'purchase','walkin',55000,1480000,81400000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,10,'Detailed bill AG/2627/09','billed','10003',1,'2026-10-07 09:22:06','2026-10-07 09:21:20','2026-10-07 09:22:06'),(11,'AGBPL002',4,'purchase','walkin',10000,1480000,14800000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,11,'Detailed bill AG/2627/10','billed','10003',1,'2026-10-07 10:38:11','2026-10-07 10:15:22','2026-10-07 10:38:11'),(12,'AGBPL002',4,'purchase','walkin',500,1480000,740000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_applicable',NULL,12,'Detailed bill AG/2627/11','billed','10003',1,'2026-10-07 11:50:31','2026-10-07 11:49:57','2026-10-07 11:50:31');
/*!40000 ALTER TABLE `branch_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_settings`
--

DROP TABLE IF EXISTS `business_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_settings` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `sale_rate_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `purchase_rate_paise_per_gram` bigint(20) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_business_settings_admin` (`updated_by`),
  CONSTRAINT `fk_business_settings_admin` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_settings`
--

LOCK TABLES `business_settings` WRITE;
/*!40000 ALTER TABLE `business_settings` DISABLE KEYS */;
INSERT INTO `business_settings` VALUES (1,1520000,1480000,NULL,'2026-10-06 07:22:53');
/*!40000 ALTER TABLE `business_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (4,1,7,NULL,'storage/chat/154c292478069f2729f41e6efa032f1a8ef95d4ec51cf539.webm','voice-note-1791632642500.webm','audio/webm',66636,NULL,'2026-10-10 11:44:04'),(5,1,8,NULL,'storage/chat/b483effff06934843302a24a4fd60225cf169db83f845d99.png','poll_card_2.png','image/png',38669,NULL,'2026-10-10 11:48:07'),(6,1,8,NULL,'storage/chat/9adeb095769fd04d95a0e40eabfc4efb25218a764e73d513.webm','voice-note-1791632993851.webm','audio/webm',42486,NULL,'2026-10-10 11:49:56'),(7,8,1,'Notification test from Adyar Branch. Please confirm this message alert is visible.',NULL,NULL,NULL,NULL,'2026-10-10 11:52:16','2026-10-10 11:51:49'),(8,8,1,'Ding test from Adyar Branch. This new message should play the notification sound.',NULL,NULL,NULL,NULL,'2026-10-10 11:54:21','2026-10-10 11:53:30'),(9,1,8,'hihi',NULL,NULL,NULL,NULL,NULL,'2026-10-10 12:03:54'),(10,1,8,'hihi',NULL,NULL,NULL,NULL,NULL,'2026-10-10 12:04:06'),(11,1,8,'hihi',NULL,NULL,NULL,NULL,NULL,'2026-10-10 12:04:12'),(12,1,8,'hihi',NULL,NULL,NULL,NULL,NULL,'2026-10-10 12:14:22'),(13,1,8,'hihi',NULL,NULL,NULL,NULL,NULL,'2026-10-10 12:14:30');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_users`
--

DROP TABLE IF EXISTS `chat_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4600 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_users`
--

LOCK TABLES `chat_users` WRITE;
/*!40000 ALTER TABLE `chat_users` DISABLE KEYS */;
INSERT INTO `chat_users` VALUES (1,'admin','admin:1','admin@aryangold.in','Aryan Gold Administrator','Administrator',1,'2026-10-14 07:37:25','2026-10-10 10:49:11','2026-10-14 07:37:25'),(2,'admin','admin:2','floor-user@internal.aryangold','Floor Operations User','Administrator',0,'2026-10-10 10:49:11','2026-10-10 10:49:11','2026-10-10 10:49:11'),(4,'head_office','head-office:1','auditor','Head Office Auditor','Head Office Auditor',1,'2026-10-10 10:49:11','2026-10-10 10:49:11','2026-10-10 10:49:11'),(5,'head_office','head-office:2','melter','Head Office Melter','Head Office Melter',1,'2026-10-10 10:49:11','2026-10-10 10:49:11','2026-10-10 10:49:11'),(6,'head_office','head-office:17','floor','Floor Operations User','Floor Operations',1,'2026-10-10 10:49:11','2026-10-10 10:49:11','2026-10-10 10:49:11'),(7,'accounts','accounts:1','accounts','Accounts Executive','Accounts',1,'2026-10-10 10:50:15','2026-10-10 10:49:11','2026-10-10 10:50:15'),(8,'branch','branch:AGBPL002:10003','10003','Adyar Employee','Adyar Branch',1,'2026-10-10 11:53:30','2026-10-10 10:49:11','2026-10-10 11:53:30');
/*!40000 ALTER TABLE `chat_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'aryan-gold','Aryan Gold','AG','/brands/aryan-gold.png','AG','2026-10-05 09:40:20'),(2,'aryan-jewels','Aryan Jewels','AJ','/brands/aryan-jewels.png','AJ','2026-10-05 09:40:20'),(3,'lakshmi-bullion','Lakshmi Bullion','LB','/brands/lakshmi-bullion-gold.png','LB','2026-10-05 09:40:20');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (4,1,'8765332111','vinay karthik','akjshdasd@asdas.asd','akdhj aksjdh akjsjhda aksjhdasd akjhssd','akjsjhdkjajshd','Karnataka',NULL,'29','Karnataka','3363663636','1/6f67097d8570cf4d2efb7d567cb311c02308e621.jpg','AGBPL002','10001',NULL,'2026-10-06 08:22:56','2026-10-06 08:22:56');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_requests`
--

DROP TABLE IF EXISTS `fund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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

--
-- Dumping data for table `fund_requests`
--

LOCK TABLES `fund_requests` WRITE;
/*!40000 ALTER TABLE `fund_requests` DISABLE KEYS */;
INSERT INTO `fund_requests` VALUES (1,'AGBPL002',50000000,50000000,'INITIAL FUND','approved','10001',1,'2026-10-06 07:39:01',NULL,'2026-10-06 07:38:44','2026-10-06 07:39:01');
/*!40000 ALTER TABLE `fund_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gatti_sales`
--

DROP TABLE IF EXISTS `gatti_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gatti_sales`
--

LOCK TABLES `gatti_sales` WRITE;
/*!40000 ALTER TABLE `gatti_sales` DISABLE KEYS */;
INSERT INTO `gatti_sales` VALUES (4,1,'2026-10-10',1520000,'vk',124640000,NULL,1,'2026-10-10 08:04:31','2026-10-10 08:04:31'),(5,2,'2026-10-10',1520000,'vk',608000,NULL,1,'2026-10-10 08:04:48','2026-10-10 08:04:48');
/*!40000 ALTER TABLE `gatti_sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `head_office_ornament_audits`
--

DROP TABLE IF EXISTS `head_office_ornament_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `head_office_ornament_audits`
--

LOCK TABLES `head_office_ornament_audits` WRITE;
/*!40000 ALTER TABLE `head_office_ornament_audits` DISABLE KEYS */;
INSERT INTO `head_office_ornament_audits` VALUES (1,2,'grouped',12985,1,1,'2026-10-07 10:48:28','2026-10-07 10:48:28','machhine error'),(2,3,'grouped',55000,1,1,'2026-10-07 10:48:31','2026-10-07 10:48:31',NULL),(3,4,'grouped',10000,1,1,'2026-10-07 10:48:34','2026-10-07 10:48:34',NULL),(4,1,'grouped',8000,1,1,'2026-10-07 10:48:44','2026-10-07 10:48:44',NULL),(5,5,'grouped',500,1,1,'2026-10-07 11:55:06','2026-10-07 11:55:06','stone');
/*!40000 ALTER TABLE `head_office_ornament_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `head_office_sessions`
--

DROP TABLE IF EXISTS `head_office_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `head_office_sessions`
--

LOCK TABLES `head_office_sessions` WRITE;
/*!40000 ALTER TABLE `head_office_sessions` DISABLE KEYS */;
INSERT INTO `head_office_sessions` VALUES (16,'132a6c9cb82e8d2f7428cf6b902bb0ffb67fd9eccfdcce0e36ee3ed40be7e2c3',17,'2026-10-10 19:31:46','2026-10-10 07:31:46');
/*!40000 ALTER TABLE `head_office_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `head_office_users`
--

DROP TABLE IF EXISTS `head_office_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `head_office_users`
--

LOCK TABLES `head_office_users` WRITE;
/*!40000 ALTER TABLE `head_office_users` DISABLE KEYS */;
INSERT INTO `head_office_users` VALUES (1,'auditor','Head Office Auditor','auditor',NULL,'aebe309ed20242d630773af8096fd44a:84f76623190544797cd77bcc396fa7eaf7b523825ba696176719f357b6ab11cb8998fd0a3b7385813fb025e30991fc5d380408a0d101e4839ac05c1260085a81',1,'2026-10-07 06:17:44','2026-10-07 10:54:32'),(2,'melter','Head Office Melter','melter',NULL,'3050df076e05f085a56fd8fc0e5919ee:ed7cf96455d9298dee327b1f0edb097f45f57704094cd2afa7336900f957a66d0efbcca4507a3f870e956c98925d84a66b35f47c0de2ad6fb1f969fa9254b4e9',1,'2026-10-07 06:17:44','2026-10-07 10:51:50'),(17,'floor','Floor Operations User','floor',2,'654545d73c70d1ca9b12df556cf69d81:bdcf453d7aa4c511d7e8ae21eb8ac69d4b3f07565929b76269eb404726a36a3254d1bfdd1118e238157e5bd97a4d9ec0a4592c5e628b68206d51754abaec35aa',1,'2026-10-10 07:31:35','2026-10-10 07:31:35');
/*!40000 ALTER TABLE `head_office_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_sequences`
--

DROP TABLE IF EXISTS `invoice_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_sequences` (
  `company_id` int(10) unsigned NOT NULL,
  `invoice_year` smallint(5) unsigned NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`company_id`,`invoice_year`),
  CONSTRAINT `fk_sequence_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_sequences`
--

LOCK TABLES `invoice_sequences` WRITE;
/*!40000 ALTER TABLE `invoice_sequences` DISABLE KEYS */;
INSERT INTO `invoice_sequences` VALUES (1,2026,11);
/*!40000 ALTER TABLE `invoice_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kyc_records`
--

DROP TABLE IF EXISTS `kyc_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kyc_records`
--

LOCK TABLES `kyc_records` WRITE;
/*!40000 ALTER TABLE `kyc_records` DISABLE KEYS */;
INSERT INTO `kyc_records` VALUES (4,4,1,'pan','bJ90lF2KYJ9xQWbp.rTPmtYXdIWVXhInLokUM4w.-6flUBsK-xT-KA','b9dc45f26582b59c0feea5c3bd27434a36d2992acd00e72c44c5fe5a5c9411cc','656J','1/d95fc62aa1004fe851370865cbf4650a835c2c2e.jpg','Logo.jpg','image/jpeg',0,'10001',NULL,'2026-10-06 08:22:56');
/*!40000 ALTER TABLE `kyc_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `melt_daily_sequences`
--

DROP TABLE IF EXISTS `melt_daily_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `melt_daily_sequences` (
  `melt_date` date NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`melt_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `melt_daily_sequences`
--

LOCK TABLES `melt_daily_sequences` WRITE;
/*!40000 ALTER TABLE `melt_daily_sequences` DISABLE KEYS */;
INSERT INTO `melt_daily_sequences` VALUES ('2026-10-07',2);
/*!40000 ALTER TABLE `melt_daily_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `melt_group_items`
--

DROP TABLE IF EXISTS `melt_group_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `melt_group_items`
--

LOCK TABLES `melt_group_items` WRITE;
/*!40000 ALTER TABLE `melt_group_items` DISABLE KEYS */;
INSERT INTO `melt_group_items` VALUES (1,1,2,12985,'2026-10-07 10:49:02'),(2,1,3,55000,'2026-10-07 10:49:02'),(3,1,4,10000,'2026-10-07 10:49:02'),(4,1,1,8000,'2026-10-07 10:49:02'),(5,2,5,500,'2026-10-07 11:55:18');
/*!40000 ALTER TABLE `melt_group_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `melt_groups`
--

DROP TABLE IF EXISTS `melt_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `melt_groups`
--

LOCK TABLES `melt_groups` WRITE;
/*!40000 ALTER TABLE `melt_groups` DISABLE KEYS */;
INSERT INTO `melt_groups` VALUES (1,'20261007-agbpl-001','2026-10-07','completed',85985,85985,82000,5000,91.990,'remove stone in 55g ring','machhine error',1,2,'2026-10-07 11:59:43','2026-10-07 10:49:02','2026-10-07 11:59:43'),(2,'20261007-agbpl-002','2026-10-07','completed',500,500,400,200,91.993,NULL,NULL,1,2,'2026-10-07 11:56:13','2026-10-07 11:55:18','2026-10-07 11:56:13');
/*!40000 ALTER TABLE `melt_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES (26,'d30b74bcdf30a9411105edd5d606ef0f270193f13c658ff517a2b8f76d1b1b97',1,1,'2026-10-14 11:44:27','2026-10-07 11:44:27'),(27,'c1cb4e596f79bf062f1565f29e80c04f7e01f9f74b501ffa3bef8fd5f05a2ab6',1,1,'2026-10-17 04:59:41','2026-10-10 04:59:41'),(28,'8dac35a912243a6b5879db292b4432a8780e230bc2e5994b0c00cc60f2d63a75',1,1,'2026-10-17 05:00:18','2026-10-10 05:00:18'),(29,'47c3caa11f92c9f05a58c6621034eb27c2c03e50e966c85237a8f4c8b1ca90a2',1,1,'2026-10-17 07:18:07','2026-10-10 07:18:07'),(30,'a10303cd49dfe56bcec655c20734566c36c475f4f31455c9638d0a218c1d7b53',1,1,'2026-10-17 07:35:58','2026-10-10 07:35:58'),(31,'c4dfcd0e408137165b7dcdeb7bee1802da74338c90245ee0c480059a26f74ec6',1,1,'2026-10-17 07:49:06','2026-10-10 07:49:06'),(32,'c7ad45940701b9719a0fd9b04fdd15a5c68b706aa9d7ae247cbd77140bbe580e',1,1,'2026-10-17 07:49:40','2026-10-10 07:49:40'),(33,'0224b7cfa792f31f541e61d7714b213e151f4dca9cff3fdf978f839aba722e9e',1,1,'2026-10-17 07:49:46','2026-10-10 07:49:46'),(34,'732f418ba8434e7185a77c7cd47c4d6891a2607fdfdfe5833c07614f27b84696',1,1,'2026-10-17 07:50:06','2026-10-10 07:50:06'),(35,'39838afd3fe5e5b578bfe628d74e0a830b99b0d56a34cf41ba54970946ceeee4',1,1,'2026-10-17 09:50:01','2026-10-10 09:50:01'),(36,'88b8e83fc7156c9f49db8d1d9e45a9f41e56305a113bbc9960f34b2bdfafd13b',1,1,'2026-10-17 10:50:03','2026-10-10 10:50:03'),(37,'6669b6160501ad053384fb4a131109028a870a11712feed951517f01165e5ebb',1,1,'2026-10-17 10:50:13','2026-10-10 10:50:13'),(38,'42658cad8325f9fd4804b6f29a1bc1ca556518c8d2e902076e2a94a8d4d61fff',1,1,'2026-10-17 11:40:08','2026-10-10 11:40:08');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_adjustments`
--

DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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

--
-- Dumping data for table `stock_adjustments`
--

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'aj_dev'
--

--
-- Dumping routines for database 'aj_dev'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-14 15:49:42
