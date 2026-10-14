/*M!999999\- enable the sandbox mode */
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `admin_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sender_admin_id` bigint(20) unsigned NOT NULL,
  `receiver_admin_id` bigint(20) unsigned NOT NULL,
  `body` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_messages_conversation_index` (`sender_admin_id`,`receiver_admin_id`,`created_at`),
  KEY `admin_messages_unread_index` (`receiver_admin_id`,`read_at`),
  CONSTRAINT `admin_messages_receiver_admin_id_foreign` FOREIGN KEY (`receiver_admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admin_messages_sender_admin_id_foreign` FOREIGN KEY (`sender_admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `audience_type` varchar(20) NOT NULL,
  `audience_value` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'Attica Pagar',
  `body` text NOT NULL,
  `sent_by` bigint(20) unsigned DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_notifications_audience_type_audience_value_index` (`audience_type`,`audience_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` bigint(20) DEFAULT NULL,
  `address` longtext DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `theme_preference` varchar(255) NOT NULL DEFAULT 'blue-theme',
  `card_style` varchar(255) NOT NULL DEFAULT 'rounded',
  `table_density` varchar(255) NOT NULL DEFAULT 'comfortable',
  `sidebar_collapsed` tinyint(1) NOT NULL DEFAULT 0,
  `theme_primary_color` varchar(7) DEFAULT NULL,
  `theme_background_color` varchar(7) DEFAULT NULL,
  `theme_surface_color` varchar(7) DEFAULT NULL,
  `theme_sidebar_background_color` varchar(7) DEFAULT NULL,
  `theme_text_color` varchar(7) DEFAULT NULL,
  `theme_muted_text_color` varchar(7) DEFAULT NULL,
  `theme_border_color` varchar(7) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `password_hint` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'hr_admin',
  `position` varchar(255) DEFAULT NULL,
  `sidebar_menu_permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sidebar_menu_permissions`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admins_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `empId` varchar(255) NOT NULL,
  `check_in_branch_id` varchar(255) DEFAULT NULL,
  `check_out_branch_id` varchar(255) DEFAULT NULL,
  `photo_path` varchar(255) NOT NULL,
  `check_out_photo_path` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `check_out_latitude` decimal(10,7) DEFAULT NULL,
  `check_out_longitude` decimal(10,7) DEFAULT NULL,
  `check_in_date` date NOT NULL,
  `check_in_time` time NOT NULL,
  `check_out_date` date DEFAULT NULL,
  `check_out_time` time DEFAULT NULL,
  `check_in_distance` varchar(255) DEFAULT NULL,
  `check_out_distance` varchar(255) DEFAULT NULL,
  `attendance_status_override` varchar(255) DEFAULT NULL,
  `attendance_status_override_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `check_in_submission_id` char(36) DEFAULT NULL,
  `check_out_submission_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_emp_checkin_date_unique` (`empId`,`check_in_date`),
  UNIQUE KEY `attendance_check_in_submission_id_unique` (`check_in_submission_id`),
  UNIQUE KEY `attendance_check_out_submission_id_unique` (`check_out_submission_id`),
  KEY `attendance_empid_check_in_date_index` (`empId`,`check_in_date`),
  KEY `attendance_emp_id_id_idx` (`empId`,`id`),
  KEY `attendance_emp_checkout_id_idx` (`empId`,`check_out_date`,`id`),
  KEY `attendance_check_in_date_idx` (`check_in_date`),
  KEY `attendance_branch_checkin_date_idx` (`check_in_branch_id`,`check_in_date`),
  KEY `attendance_check_date_emp_id_idx` (`check_in_date`,`empId`,`id`),
  KEY `attendance_emp_date_id_idx` (`empId`,`check_in_date`,`id`),
  KEY `attendance_in_date_branch_emp_idx` (`check_in_date`,`check_in_branch_id`,`empId`),
  KEY `attendance_out_date_branch_emp_idx` (`check_out_date`,`check_out_branch_id`,`empId`),
  KEY `attendance_review_date_status_emp_idx` (`check_in_date`,`attendance_status_override`,`empId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `attendance_day_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_day_overrides` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `emp_id` varchar(100) NOT NULL,
  `attendance_date` date NOT NULL,
  `final_status` varchar(20) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `created_by` varchar(255) NOT NULL DEFAULT '',
  `updated_by` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_day_overrides_emp_id_attendance_date_unique` (`emp_id`,`attendance_date`),
  KEY `attendance_day_overrides_attendance_date_index` (`attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `attendance_fraud_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_fraud_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `emp_id` varchar(255) NOT NULL,
  `attendance_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `fraud_type` varchar(255) NOT NULL DEFAULT 'mobile_screen',
  `confidence` decimal(5,2) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `proof_path` varchar(255) NOT NULL,
  `reported_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_fraud_reports_emp_id_reported_at_index` (`emp_id`,`reported_at`),
  KEY `attendance_fraud_reports_employee_id_index` (`employee_id`),
  KEY `attendance_fraud_reports_emp_id_index` (`emp_id`),
  KEY `attendance_fraud_reports_attendance_id_index` (`attendance_id`),
  KEY `attendance_fraud_reports_branch_id_index` (`branch_id`),
  KEY `attendance_fraud_reports_fraud_type_index` (`fraud_type`),
  KEY `attendance_fraud_reports_source_index` (`source`),
  KEY `attendance_fraud_reports_reported_at_index` (`reported_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `birthday_sms_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `birthday_sms_deliveries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `birthday_date` date NOT NULL,
  `phone` varchar(30) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `provider_response` text DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `birthday_sms_deliveries_employee_id_birthday_date_unique` (`employee_id`,`birthday_date`),
  CONSTRAINT `birthday_sms_deliveries_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `birthday_sms_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `birthday_sms_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `send_time` time NOT NULL DEFAULT '09:00:00',
  `provider_template_id` varchar(255) DEFAULT NULL,
  `message_template` text NOT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `birthday_sms_settings_updated_by_foreign` (`updated_by`),
  CONSTRAINT `birthday_sms_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branch_opening_admin_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_opening_admin_alerts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) NOT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `opening_date` date NOT NULL,
  `opening_time` time NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'overdue',
  `notified_at` timestamp NULL DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `overdue_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `opener_employee_id` bigint(20) unsigned DEFAULT NULL,
  `opener_emp_id` varchar(50) DEFAULT NULL,
  `opener_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_opening_admin_alert_unique` (`branch_id`,`opening_date`),
  KEY `branch_opening_admin_alerts_status_opening_date_index` (`status`,`opening_date`),
  KEY `branch_alert_status_date_branch_idx` (`status`,`opening_date`,`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branch_opening_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_opening_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `assignment_type` varchar(30) NOT NULL,
  `assigned_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_opening_assignment_unique` (`branch_id`,`employee_id`,`assignment_type`),
  KEY `branch_opening_assignments_branch_id_assignment_type_index` (`branch_id`,`assignment_type`),
  KEY `branch_opening_assignments_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branch_opening_daily_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_opening_daily_activities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) NOT NULL,
  `attendance_date` date NOT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `opened_by_employee_id` bigint(20) unsigned DEFAULT NULL,
  `opened_by_emp_id` varchar(50) DEFAULT NULL,
  `opened_by_name` varchar(255) DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_by_employee_id` bigint(20) unsigned DEFAULT NULL,
  `closed_by_emp_id` varchar(50) DEFAULT NULL,
  `closed_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_opening_daily_activities_unique` (`branch_id`,`attendance_date`),
  KEY `branch_opening_daily_activities_date_idx` (`attendance_date`,`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branch_opening_daily_summaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_opening_daily_summaries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) NOT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `scheduled_opening_time` time DEFAULT NULL,
  `opening_status` varchar(30) NOT NULL DEFAULT 'pending',
  `opened_at` timestamp NULL DEFAULT NULL,
  `opened_by_employee_id` bigint(20) unsigned DEFAULT NULL,
  `opened_by_emp_id` varchar(50) DEFAULT NULL,
  `opened_by_name` varchar(255) DEFAULT NULL,
  `first_check_in_at` timestamp NULL DEFAULT NULL,
  `first_check_in_emp_id` varchar(50) DEFAULT NULL,
  `first_check_in_name` varchar(255) DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_by_employee_id` bigint(20) unsigned DEFAULT NULL,
  `closed_by_emp_id` varchar(50) DEFAULT NULL,
  `closed_by_name` varchar(255) DEFAULT NULL,
  `total_check_ins` int(10) unsigned NOT NULL DEFAULT 0,
  `total_check_outs` int(10) unsigned NOT NULL DEFAULT 0,
  `opening_delay_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `open_duration_minutes` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_opening_daily_summary_unique` (`branch_id`,`attendance_date`),
  KEY `branch_open_daily_date_status_idx` (`attendance_date`,`opening_status`),
  KEY `branch_open_daily_branch_date_idx` (`branch_id`,`attendance_date`),
  KEY `branch_open_status_date_idx` (`opening_status`,`attendance_date`),
  KEY `branch_open_date_name_idx` (`attendance_date`,`branch_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branch_opening_notification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_opening_notification_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `notification_type` varchar(40) NOT NULL,
  `notification_key` varchar(120) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `body` text DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_opening_notification_log_unique` (`branch_id`,`employee_id`,`notification_type`,`notification_key`),
  KEY `branch_opening_log_type_key_idx` (`notification_type`,`notification_key`),
  KEY `branch_open_log_branch_emp_created_idx` (`branch_id`,`employee_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branch_opening_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_opening_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) NOT NULL,
  `opening_time` time NOT NULL,
  `admin_phone` varchar(30) DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_opening_settings_branch_id_unique` (`branch_id`),
  KEY `branch_opening_settings_opening_time_index` (`opening_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `empId` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `assigned_branch_id` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `rating` tinyint(3) unsigned DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'Active',
  `inactive_reason` text DEFAULT NULL,
  `last_working_date` date DEFAULT NULL,
  `last_login_branch_id` varchar(255) DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `attendance_blocked_on` date DEFAULT NULL,
  `attendance_unblocked_on` date DEFAULT NULL,
  `doj` date DEFAULT NULL,
  `mailId` varchar(255) NOT NULL,
  `shift_timing` varchar(255) DEFAULT NULL,
  `is_night_shift` tinyint(1) NOT NULL DEFAULT 0,
  `is_outsourced` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `gender` varchar(255) DEFAULT NULL,
  `marital_status` varchar(255) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `salary` int(11) DEFAULT NULL,
  `advance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `pf` decimal(12,2) NOT NULL DEFAULT 0.00,
  `pf_eligible` tinyint(1) DEFAULT NULL,
  `pfsecuritydeposit` decimal(12,2) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `marked_inactive_by` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`marked_inactive_by`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_empid_unique` (`empId`),
  KEY `employee_status_idx` (`status`),
  KEY `employee_status_name_idx` (`status`,`name`),
  KEY `employee_name_emp_idx` (`name`,`empId`),
  KEY `employee_night_shift_emp_idx` (`is_night_shift`,`empId`),
  KEY `employee_last_login_branch_idx` (`last_login_branch_id`),
  KEY `employee_assigned_branch_id_index` (`assigned_branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_advance_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_advance_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(10) unsigned NOT NULL,
  `emp_id` varchar(100) NOT NULL,
  `request_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `request_note` text DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `verified_by` varchar(255) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejected_by` varchar(255) DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_advance_requests_employee_id_index` (`employee_id`),
  KEY `employee_advance_requests_emp_id_index` (`emp_id`),
  KEY `employee_advance_requests_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_advance_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_advance_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `advance_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `source_type` varchar(20) NOT NULL DEFAULT 'manual',
  `source_file` varchar(255) DEFAULT NULL,
  `source_row_no` int(10) unsigned DEFAULT NULL,
  `row_hash` varchar(64) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_advance_transactions_emp_id_advance_date_index` (`emp_id`,`advance_date`),
  KEY `emp_adv_employee_date_id_idx` (`employee_id`,`advance_date`,`id`),
  KEY `emp_adv_date_employee_idx` (`advance_date`,`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_app_credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_app_credentials` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `emp_id` varchar(100) NOT NULL,
  `branch_id` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_set_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_app_credentials_emp_branch_unique` (`emp_id`,`branch_id`),
  KEY `employee_app_credentials_branch_emp_idx` (`branch_id`,`emp_id`),
  KEY `employee_app_credentials_employee_id_index` (`employee_id`),
  KEY `employee_app_credentials_emp_id_index` (`emp_id`),
  KEY `employee_app_credentials_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_bank_detail_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_bank_detail_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(10) unsigned NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `request_note` text DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `requested_emp_name` varchar(150) DEFAULT NULL,
  `requested_bank_name` varchar(150) DEFAULT NULL,
  `requested_bank_ac_no` varchar(50) DEFAULT NULL,
  `requested_ifsc_code` varchar(30) DEFAULT NULL,
  `requested_passbook_doc` varchar(255) DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `verified_by` varchar(100) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `requested_uan_number` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_bank_detail_requests_employee_id_index` (`employee_id`),
  KEY `employee_bank_detail_requests_emp_id_index` (`emp_id`),
  KEY `employee_bank_detail_requests_status_index` (`status`),
  KEY `bank_detail_status_created_idx` (`status`,`created_at`),
  KEY `bank_detail_employee_status_idx` (`employee_id`,`status`),
  KEY `bank_detail_emp_status_idx` (`emp_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_device_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_device_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `token` text NOT NULL,
  `token_hash` char(64) NOT NULL,
  `platform` varchar(20) DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_device_tokens_token_hash_unique` (`token_hash`),
  KEY `employee_device_tokens_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `document_type` varchar(40) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `pay_period` varchar(7) DEFAULT NULL,
  `original_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` bigint(20) unsigned NOT NULL,
  `uploaded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_documents_employee_type_period_idx` (`employee_id`,`document_type`,`pay_period`),
  KEY `employee_documents_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_location_pings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_location_pings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `emp_id` varchar(100) NOT NULL,
  `attendance_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `latitude` decimal(11,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `branch_latitude` decimal(11,8) DEFAULT NULL,
  `branch_longitude` decimal(11,8) DEFAULT NULL,
  `distance_meters` decimal(10,2) DEFAULT NULL,
  `is_out_of_office` tinyint(1) NOT NULL DEFAULT 0,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_location_emp_recorded_idx` (`emp_id`,`recorded_at`),
  KEY `employee_location_branch_recorded_idx` (`branch_id`,`recorded_at`),
  KEY `employee_location_pings_employee_id_index` (`employee_id`),
  KEY `employee_location_pings_emp_id_index` (`emp_id`),
  KEY `employee_location_pings_attendance_id_index` (`attendance_id`),
  KEY `employee_location_pings_branch_id_index` (`branch_id`),
  KEY `employee_location_pings_is_out_of_office_index` (`is_out_of_office`),
  KEY `employee_location_pings_recorded_at_index` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_notification_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_notification_deliveries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_notification_id` bigint(20) unsigned NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_notification_unique` (`admin_notification_id`,`employee_id`),
  KEY `employee_notification_deliveries_employee_id_read_at_index` (`employee_id`,`read_at`),
  KEY `emp_notify_employee_created_idx` (`employee_id`,`created_at`),
  KEY `emp_notify_read_employee_idx` (`read_at`,`employee_id`),
  CONSTRAINT `employee_notification_deliveries_admin_notification_id_foreign` FOREIGN KEY (`admin_notification_id`) REFERENCES `admin_notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_salary_holds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_salary_holds` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(10) unsigned NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `payroll_month` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `held_by` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_salary_holds_employee_id_payroll_month_unique` (`employee_id`,`payroll_month`),
  KEY `employee_salary_holds_employee_id_index` (`employee_id`),
  KEY `employee_salary_holds_emp_id_index` (`emp_id`),
  KEY `employee_salary_holds_payroll_month_index` (`payroll_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_shift_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_shift_histories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `shift_timing` varchar(255) NOT NULL,
  `effective_from` date NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_shift_histories_employee_id_effective_from_unique` (`employee_id`,`effective_from`),
  KEY `employee_shift_histories_employee_id_effective_from_index` (`employee_id`,`effective_from`),
  KEY `employee_shift_histories_created_by_foreign` (`created_by`),
  CONSTRAINT `employee_shift_histories_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_shift_histories_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employeedetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employeedetails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `empName` varchar(150) NOT NULL,
  `employeeId` varchar(50) NOT NULL,
  `designation` varchar(50) NOT NULL,
  `bankName` varchar(150) NOT NULL,
  `bankAcNo` varchar(50) NOT NULL,
  `ifscCode` varchar(30) NOT NULL,
  `passbookDoc` varchar(255) NOT NULL DEFAULT '',
  `salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `branchId` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `accountVerified` varchar(20) NOT NULL DEFAULT 'Pending',
  `date` date NOT NULL,
  `time` time NOT NULL,
  `totalWorkingDays` decimal(6,2) NOT NULL DEFAULT 0.00,
  `absentDays` decimal(6,2) NOT NULL DEFAULT 0.00,
  `presentDays` decimal(6,2) NOT NULL DEFAULT 0.00,
  `penalty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `advanceSalary` decimal(10,2) NOT NULL DEFAULT 0.00,
  `finalSalary` decimal(10,2) NOT NULL DEFAULT 0.00,
  `salaryPaymentStatus` varchar(20) NOT NULL DEFAULT '',
  `salaryVerifiedDate` date DEFAULT NULL,
  `salaryVerifiedTime` time DEFAULT NULL,
  `salaryPaidDate` date DEFAULT NULL,
  `salaryPaidTime` time DEFAULT NULL,
  `salaryPaidBy` varchar(50) NOT NULL DEFAULT '',
  `salaryBankName` varchar(50) NOT NULL DEFAULT '',
  `salaryProcessingBy` varchar(50) NOT NULL DEFAULT '',
  `salaryProcessingUser` varchar(100) NOT NULL DEFAULT '',
  `salaryProcessingTime` datetime DEFAULT NULL,
  `aadhaarNo` varchar(20) NOT NULL DEFAULT '',
  `panNo` varchar(20) NOT NULL DEFAULT '',
  `pfAmount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `remarks` text DEFAULT NULL,
  `salaryDate` date DEFAULT NULL,
  `uanNumber` varchar(30) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_employeeId` (`employeeId`),
  KEY `idx_branchId` (`branchId`),
  KEY `employee_details_emp_id_latest_idx` (`employeeId`,`id`),
  KEY `employee_details_branch_status_idx` (`branchId`,`status`),
  KEY `employee_details_verified_emp_idx` (`accountVerified`,`employeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ho_attendance_import_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ho_attendance_import_overrides` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `emp_id` varchar(100) NOT NULL,
  `attendance_date` date NOT NULL,
  `final_status` varchar(20) NOT NULL,
  `created_by` varchar(255) NOT NULL DEFAULT '',
  `updated_by` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ho_attendance_import_overrides_emp_id_attendance_date_unique` (`emp_id`,`attendance_date`),
  KEY `ho_attendance_import_overrides_attendance_date_index` (`attendance_date`),
  KEY `ho_att_override_date_emp_idx` (`attendance_date`,`emp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ho_attendance_imports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ho_attendance_imports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_file` varchar(255) NOT NULL,
  `import_batch` varchar(50) NOT NULL,
  `source_row_no` int(10) unsigned NOT NULL,
  `emp_id` varchar(100) NOT NULL,
  `employee_name` varchar(255) NOT NULL DEFAULT '',
  `branch_name` varchar(255) NOT NULL DEFAULT 'HO',
  `attendance_date` date NOT NULL,
  `login_time` time DEFAULT NULL,
  `logout_time` time DEFAULT NULL,
  `attendance_status` varchar(100) NOT NULL DEFAULT '',
  `work_duration` varchar(50) NOT NULL DEFAULT '',
  `late_bucket` varchar(30) NOT NULL DEFAULT 'Unknown',
  `raw_row` longtext DEFAULT NULL,
  `row_hash` char(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ho_attendance_imports_row_hash_unique` (`row_hash`),
  KEY `ho_attendance_imports_emp_id_attendance_date_index` (`emp_id`,`attendance_date`),
  KEY `ho_attendance_imports_attendance_date_index` (`attendance_date`),
  KEY `ho_attendance_imports_import_batch_index` (`import_batch`),
  KEY `ho_att_import_date_emp_idx` (`attendance_date`,`emp_id`),
  KEY `ho_att_import_emp_date_status_idx` (`emp_id`,`attendance_date`,`attendance_status`),
  KEY `ho_att_import_date_login_idx` (`attendance_date`,`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `id_card_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_card_submissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `designation` varchar(255) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` varchar(5) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `emergency_contact` varchar(20) NOT NULL,
  `home_address` text NOT NULL,
  `photo_path` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_card_submissions_employee_id_unique` (`employee_id`),
  UNIQUE KEY `id_card_submissions_emp_id_unique` (`emp_id`),
  KEY `id_card_submissions_employee_id_index` (`employee_id`),
  CONSTRAINT `id_card_submissions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `leave_date` date NOT NULL,
  `reason` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `review_note` text DEFAULT NULL,
  `reviewed_by` varchar(255) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_requests_employee_id_leave_date_index` (`employee_id`,`leave_date`),
  KEY `leave_requests_status_leave_date_index` (`status`,`leave_date`),
  KEY `leave_requests_emp_id_status_index` (`emp_id`,`status`),
  KEY `leave_status_created_idx` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_employee_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_employee_locations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `outsource_location_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `outsource_employee_location_unique` (`employee_id`,`outsource_location_id`),
  KEY `outsource_employee_location_location_idx` (`outsource_location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_locations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `addressline` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `pincode` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `status` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `outsource_locations_location_code_unique` (`location_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recruitment_candidate_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recruitment_candidate_activity_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `recruitment_candidate_id` bigint(20) unsigned NOT NULL,
  `admin_id` bigint(20) unsigned DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `actor_role` varchar(255) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `remarks` text DEFAULT NULL,
  `changed_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changed_fields`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rcal_candidate_fk` (`recruitment_candidate_id`),
  KEY `rcal_admin_fk` (`admin_id`),
  CONSTRAINT `rcal_admin_fk` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rcal_candidate_fk` FOREIGN KEY (`recruitment_candidate_id`) REFERENCES `recruitment_candidates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recruitment_candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recruitment_candidates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `recruitment_form_link_id` bigint(20) unsigned DEFAULT NULL,
  `resubmission_of_candidate_id` bigint(20) unsigned DEFAULT NULL,
  `public_token` varchar(255) NOT NULL,
  `submission_code` varchar(255) DEFAULT NULL,
  `hiring_update_token` varchar(255) DEFAULT NULL,
  `hiring_update_requested_at` timestamp NULL DEFAULT NULL,
  `joining_update_token` varchar(255) DEFAULT NULL,
  `joining_update_requested_at` timestamp NULL DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'draft',
  `position_applied_for` varchar(255) DEFAULT NULL,
  `candidate_name` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `whatsapp_number` varchar(255) DEFAULT NULL,
  `aadhaar_number` varchar(12) DEFAULT NULL,
  `is_whatsapp_same_as_contact` tinyint(1) NOT NULL DEFAULT 1,
  `email` varchar(255) DEFAULT NULL,
  `candidate_photo_path` varchar(255) DEFAULT NULL,
  `resume_file_path` varchar(255) DEFAULT NULL,
  `resume_original_name` varchar(255) DEFAULT NULL,
  `interview_video_path` varchar(255) DEFAULT NULL,
  `interview_video_original_name` varchar(255) DEFAULT NULL,
  `employee_photo_path` varchar(255) DEFAULT NULL,
  `document_photo_paths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`document_photo_paths`)),
  `hiring_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`hiring_payload`)),
  `onboarding_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`onboarding_payload`)),
  `fixed_salary` decimal(12,2) DEFAULT NULL,
  `hr_admin_name` varchar(255) DEFAULT NULL,
  `interview_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`interview_payload`)),
  `created_by_admin_id` bigint(20) unsigned DEFAULT NULL,
  `hiring_admin_name` varchar(255) DEFAULT NULL,
  `joining_admin_id` bigint(20) unsigned DEFAULT NULL,
  `joining_admin_name` varchar(255) DEFAULT NULL,
  `verification_shared_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verified_ip` varchar(64) DEFAULT NULL,
  `joining_started_at` timestamp NULL DEFAULT NULL,
  `onboarding_completed_at` timestamp NULL DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT NULL,
  `generated_emp_id` varchar(7) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recruitment_candidates_public_token_unique` (`public_token`),
  UNIQUE KEY `recruitment_candidates_generated_emp_id_unique` (`generated_emp_id`),
  UNIQUE KEY `recruitment_candidates_submission_code_unique` (`submission_code`),
  UNIQUE KEY `recruitment_candidates_hiring_update_token_unique` (`hiring_update_token`),
  UNIQUE KEY `recruitment_candidates_joining_update_token_unique` (`joining_update_token`),
  KEY `recruitment_candidates_created_by_admin_id_foreign` (`created_by_admin_id`),
  KEY `recruitment_candidates_joining_admin_id_foreign` (`joining_admin_id`),
  KEY `recruitment_candidates_status_index` (`status`),
  KEY `recruitment_candidates_recruitment_form_link_id_foreign` (`recruitment_form_link_id`),
  KEY `recruitment_candidates_resubmission_of_candidate_id_foreign` (`resubmission_of_candidate_id`),
  KEY `recruitment_candidates_aadhaar_number_index` (`aadhaar_number`),
  KEY `recruitment_status_created_idx` (`status`,`created_at`),
  KEY `recruitment_position_status_idx` (`position_applied_for`,`status`),
  KEY `recruitment_form_status_idx` (`recruitment_form_link_id`,`status`),
  CONSTRAINT `recruitment_candidates_created_by_admin_id_foreign` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recruitment_candidates_joining_admin_id_foreign` FOREIGN KEY (`joining_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recruitment_candidates_recruitment_form_link_id_foreign` FOREIGN KEY (`recruitment_form_link_id`) REFERENCES `recruitment_form_links` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recruitment_candidates_resubmission_of_candidate_id_foreign` FOREIGN KEY (`resubmission_of_candidate_id`) REFERENCES `recruitment_candidates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recruitment_form_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recruitment_form_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `public_token` varchar(255) NOT NULL,
  `hiring_date` date DEFAULT NULL,
  `question_bank` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`question_bank`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_admin_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recruitment_form_links_public_token_unique` (`public_token`),
  KEY `recruitment_form_links_created_by_admin_id_foreign` (`created_by_admin_id`),
  KEY `recruitment_form_links_is_active_index` (`is_active`),
  KEY `recruitment_links_active_date_idx` (`is_active`,`hiring_date`),
  CONSTRAINT `recruitment_form_links_created_by_admin_id_foreign` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `salary_calculation_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_calculation_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `fixed_30_days` tinyint(1) NOT NULL DEFAULT 0,
  `pf_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `salary_calculation_settings_updated_by_foreign` (`updated_by`),
  CONSTRAINT `salary_calculation_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `site_visit_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_visit_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `visit_date` date NOT NULL,
  `site_location` varchar(255) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `photo_path` varchar(255) NOT NULL,
  `reason` text NOT NULL,
  `approved_by` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `review_note` text DEFAULT NULL,
  `reviewed_by` varchar(255) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `attendance_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `site_visit_requests_employee_id_visit_date_index` (`employee_id`,`visit_date`),
  KEY `site_visit_requests_status_visit_date_index` (`status`,`visit_date`),
  KEY `site_visit_requests_emp_id_status_index` (`emp_id`,`status`),
  KEY `site_visit_status_created_idx` (`status`,`created_at`),
  KEY `site_visit_review_filter_order_idx` (`status`,`visit_date`,`employee_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `te_tracker_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `te_tracker_visits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `location_type` varchar(20) NOT NULL DEFAULT 'branch',
  `branch_id` varchar(50) NOT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `release_place` varchar(255) DEFAULT NULL,
  `branch_latitude` decimal(10,7) DEFAULT NULL,
  `branch_longitude` decimal(10,7) DEFAULT NULL,
  `captured_latitude` decimal(10,7) NOT NULL,
  `captured_longitude` decimal(10,7) NOT NULL,
  `distance_from_branch` decimal(10,2) DEFAULT NULL,
  `amount` decimal(14,2) DEFAULT NULL,
  `grams` decimal(12,3) DEFAULT NULL,
  `kms` decimal(10,2) DEFAULT NULL,
  `photo_path` varchar(255) NOT NULL,
  `visit_date` date NOT NULL,
  `visit_time` time NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `te_tracker_visits_employee_id_visit_date_index` (`employee_id`,`visit_date`),
  KEY `te_tracker_visits_emp_id_visit_date_index` (`emp_id`,`visit_date`),
  KEY `te_tracker_visits_branch_id_visit_date_index` (`branch_id`,`visit_date`),
  KEY `te_tracker_date_branch_idx` (`visit_date`,`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wp_branches_database`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wp_branches_database` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `branchId` varchar(255) NOT NULL,
  `addressline` varchar(255) NOT NULL,
  `area` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `pincode` varchar(255) NOT NULL,
  `branchName` varchar(255) DEFAULT NULL,
  `timings` varchar(50) DEFAULT '9:30 AM - 6:30 PM',
  `latitude` varchar(255) DEFAULT NULL,
  `longitude` varchar(255) DEFAULT NULL,
  `url` tinytext DEFAULT NULL,
  `status` int(10) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `branches_status_idx` (`status`),
  KEY `branches_status_name_idx` (`status`,`branchName`),
  KEY `branches_branch_id_status_idx` (`branchId`,`status`),
  KEY `branches_state_city_status_idx` (`state`,`city`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

/*M!999999\- enable the sandbox mode */
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'2014_10_12_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'2014_10_12_100000_create_password_resets_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'2019_08_19_000000_create_failed_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'2019_12_14_000001_create_personal_access_tokens_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'2026_03_25_000002_create_attendance_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'2026_03_28_000001_add_check_out_photo_path_to_attendance_table',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2026_03_29_124712_create_admins_table',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2026_03_31_000001_add_attendance_session_branch_columns',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2026_03_31_000002_drop_attendance_branch_id_add_checkout_coordinates',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'2026_03_31_120000_add_attendance_overrides_and_block_tracking',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'2026_03_31_180000_create_ho_attendance_imports_table',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2026_03_31_190000_create_ho_attendance_import_overrides_table',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2026_04_02_000001_add_theme_preferences_to_admins_table',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2026_04_02_000002_add_theme_color_preferences_to_admins_table',8);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2026_04_02_000003_add_sidebar_theme_color_to_admins_table',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2026_04_07_000001_add_advance_to_employee_table',10);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2026_04_07_000002_add_pf_to_employee_table',11);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2026_04_07_000003_create_employee_advance_transactions_table',12);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'2026_04_08_000001_create_leave_requests_table',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'2026_04_08_000002_create_site_visit_requests_table',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2026_04_08_130000_add_profile_fields_to_employee_table',14);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2026_04_09_000001_add_inactive_details_to_employee_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2026_04_10_000001_add_date_of_birth_to_employee_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'2026_04_11_000001_add_night_shift_to_employee_table',16);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2026_04_11_000002_create_admin_notification_tables',16);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2026_04_14_000001_create_te_tracker_visits_table',17);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2026_04_16_000001_create_branch_opening_assignments_table',18);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2026_04_18_000001_create_employee_device_tokens_table',19);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'2026_04_20_000001_create_branch_opening_admin_alerts_table',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33,'2026_04_20_000002_create_branch_opening_notification_logs_table',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'2026_04_20_000003_create_branch_opening_daily_summaries_table',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'2026_04_17_000001_create_branch_opening_settings_table',21);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'2026_04_21_000001_add_admin_phone_to_branch_opening_settings_table',22);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'2026_04_22_000001_create_branch_opening_daily_activities_table',23);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'2026_04_24_120000_add_role_to_admins_and_seed_recruitment_users',24);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40,'2026_04_24_200000_seed_opening_admin_user',24);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (42,'2026_04_24_120100_create_recruitment_candidates_table',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (43,'2026_04_25_110000_create_recruitment_form_links_and_extend_candidates_table',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (44,'2026_04_25_170000_add_update_tokens_to_recruitment_candidates_table',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (45,'2026_04_26_000001_add_aadhaar_number_to_recruitment_candidates_table',26);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (46,'2026_04_26_000002_add_fixed_salary_to_recruitment_candidates_table',26);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (47,'2026_04_26_000003_add_admin_snapshots_and_activity_logs_to_recruitment_candidates',26);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (48,'2026_04_27_000001_add_position_to_admins_table',27);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (49,'2026_05_05_000001_add_unique_index_to_employee_emp_id',28);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (50,'2026_05_06_000001_seed_accounts_admin_user',29);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (51,'2026_05_14_000001_create_employee_details_table',30);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (52,'2026_05_14_000002_create_employee_bank_detail_requests_table',31);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (53,'2026_05_14_000003_ensure_personal_access_tokens_table_exists',32);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (54,'2026_05_14_000003_add_uan_number_to_employee_detail_flows',33);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (55,'2026_05_15_000001_add_attendance_performance_indexes',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (57,'2026_05_15_000001_add_report_performance_indexes',35);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (58,'2026_05_15_000002_create_attendance_day_overrides_table',36);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (59,'2026_05_18_000001_create_admin_messages_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (60,'2026_05_22_000001_add_pan_no_to_employee_details_table',38);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (63,'2026_05_25_000001_create_outsource_locations_and_employee_assignments',39);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (64,'2026_05_25_000002_create_employee_advance_requests_table',39);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (65,'2026_06_05_000001_add_work_visit_review_performance_index',40);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (66,'2026_06_11_000001_seed_subhr_admin_user',41);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (67,'2026_06_11_000002_create_employee_salary_holds_table',42);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (68,'2026_06_24_000001_add_pfsecuritydeposit_to_employee_table',43);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (69,'2026_06_24_000002_backfill_pfsecuritydeposit_for_may_2026',44);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (70,'2026_06_13_000001_add_assigned_branch_and_pf_eligibility_to_employee_table',45);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (71,'2026_06_24_000003_backfill_pf_eligible_for_may_pf_employees',46);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (72,'2026_06_29_000001_create_employee_location_pings_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (73,'2026_06_29_000002_seed_zonal_admin_user',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (74,'2026_07_01_000003_create_attendance_fraud_reports_table',48);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (75,'2026_07_01_000004_sync_employee_doj_from_joined_candidates',48);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (76,'2026_07_09_000001_create_employee_app_credentials_table',49);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (77,'2026_07_06_000001_add_sidebar_menu_permissions_to_admins_table',50);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (78,'2026_07_27_000001_create_id_card_submissions_table',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (79,'2026_07_28_140000_seed_csr_manager_admin',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (80,'2026_07_30_000001_create_employee_shift_histories_table',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (81,'2026_08_01_000001_create_birthday_sms_tables',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (82,'2026_08_01_000002_assign_md_role_to_existing_admin',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (83,'2026_08_04_000001_add_business_fields_to_te_tracker_visits_table',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (84,'2026_08_07_000001_create_salary_calculation_settings_table',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (85,'2026_08_10_000001_add_soft_deletes_to_id_card_submissions_table',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (86,'2026_08_11_000001_add_submission_ids_to_attendance_table',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (87,'2026_08_27_000001_replace_queens_road_bitly_url',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (88,'2026_09_04_000001_add_regularized_by_to_attendance_table',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (89,'2026_09_17_000001_add_marked_inactive_by_to_employee_table',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (90,'2026_09_22_000001_add_unique_employee_check_in_date_to_attendance_table',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (91,'2026_10_14_000001_create_employee_documents_table',53);
