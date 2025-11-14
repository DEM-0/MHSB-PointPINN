/*
 Navicat Premium Data Transfer

 Source Server         : trae
 Source Server Type    : MySQL
 Source Server Version : 80022
 Source Host           : localhost:3306
 Source Schema         : carotid_hemodynamics

 Target Server Type    : MySQL
 Target Server Version : 80022
 File Encoding         : 65001

 Date: 15/06/2025 20:21:08
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for hemodynamic_parameters
-- ----------------------------
DROP TABLE IF EXISTS `hemodynamic_parameters`;
CREATE TABLE `hemodynamic_parameters`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `stl_file_id` int NOT NULL,
  `velocity` decimal(10, 4) NULL DEFAULT NULL,
  `pressure` decimal(10, 4) NULL DEFAULT NULL,
  `wall_shear_stress` decimal(10, 4) NULL DEFAULT NULL,
  `Reynolds_number` decimal(10, 4) NULL DEFAULT NULL,
  `turbulence_intensity` decimal(10, 4) NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_hemodynamic_stl_id`(`stl_file_id`) USING BTREE,
  CONSTRAINT `hemodynamic_parameters_ibfk_1` FOREIGN KEY (`stl_file_id`) REFERENCES `stl_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of hemodynamic_parameters
-- ----------------------------
INSERT INTO `hemodynamic_parameters` VALUES (1, 1, 0.8500, 120.5000, 32.4000, 1850.2000, 6.5000, '2025-06-12 23:21:12');
INSERT INTO `hemodynamic_parameters` VALUES (2, 1, 0.7800, 118.2000, 29.8000, 1750.4000, 5.8000, '2025-06-12 23:21:12');
INSERT INTO `hemodynamic_parameters` VALUES (3, 2, 0.9200, 122.3000, 35.2000, 1950.1000, 7.2000, '2025-06-12 23:21:12');
INSERT INTO `hemodynamic_parameters` VALUES (4, 3, 1.1500, 135.6000, 45.7000, 2300.5000, 8.9000, '2025-06-12 23:21:12');
INSERT INTO `hemodynamic_parameters` VALUES (5, 4, 1.0200, 128.4000, 40.3000, 2100.7000, 7.5000, '2025-06-12 23:21:12');

-- ----------------------------
-- Table structure for patients
-- ----------------------------
DROP TABLE IF EXISTS `patients`;
CREATE TABLE `patients`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `gender` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `age` int NOT NULL,
  `height` decimal(5, 2) NULL DEFAULT NULL,
  `weight` decimal(5, 2) NULL DEFAULT NULL,
  `medical_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_patients_name`(`name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of patients
-- ----------------------------
INSERT INTO `patients` VALUES (1, '张三', 'male', 55, 175.50, 70.50, '高血压病史5年', '2025-06-12 23:21:11', '2025-06-12 23:21:11');
INSERT INTO `patients` VALUES (2, '李四', 'female', 62, 160.00, 62.00, '糖尿病史3年', '2025-06-12 23:21:11', '2025-06-12 23:21:11');
INSERT INTO `patients` VALUES (3, '王五', 'male', 48, 178.00, 75.00, '吸烟史20年', '2025-06-12 23:21:11', '2025-06-12 23:21:11');
INSERT INTO `patients` VALUES (8, '赵六', 'male', 58, 172.00, 71.00, '高血脂症', '2025-06-13 03:19:02', '2025-06-13 03:19:02');
INSERT INTO `patients` VALUES (9, '孙七', 'female', 52, 165.00, 63.00, '无', '2025-06-13 03:19:02', '2025-06-13 03:19:02');
INSERT INTO `patients` VALUES (10, '钱八', 'male', 45, 176.00, 73.50, '无', '2025-06-13 03:20:23', '2025-06-13 03:20:23');
INSERT INTO `patients` VALUES (11, '周九', 'female', 57, 163.20, 63.70, '心脏病史', '2025-06-13 03:20:23', '2025-06-13 03:20:23');
INSERT INTO `patients` VALUES (12, '吴十', 'male', 64, 179.00, 80.20, '高血压史', '2025-06-13 03:20:23', '2025-06-13 03:20:23');
INSERT INTO `patients` VALUES (13, '郑十一', 'female', 49, 168.50, 66.30, '无', '2025-06-13 03:20:23', '2025-06-13 03:20:23');
INSERT INTO `patients` VALUES (14, '王十二', 'male', 70, 172.00, 72.00, '心脏病史', '2025-06-13 03:20:23', '2025-06-13 03:20:23');
INSERT INTO `patients` VALUES (19, '小明', 'male', 18, 183.00, 53.00, '无', '2025-06-15 18:37:19', '2025-06-15 18:37:19');

-- ----------------------------
-- Table structure for prediction_results
-- ----------------------------
DROP TABLE IF EXISTS `prediction_results`;
CREATE TABLE `prediction_results`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `parameter_id` int NOT NULL,
  `predicted_value` decimal(10, 4) NULL DEFAULT NULL,
  `actual_value` decimal(10, 4) NULL DEFAULT NULL,
  `error` decimal(10, 4) NULL DEFAULT NULL,
  `model_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `prediction_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `parameter_id`(`parameter_id`) USING BTREE,
  CONSTRAINT `prediction_results_ibfk_1` FOREIGN KEY (`parameter_id`) REFERENCES `hemodynamic_parameters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of prediction_results
-- ----------------------------
INSERT INTO `prediction_results` VALUES (1, 1, 0.8400, 0.8500, 1.1760, 'v1.2.0', '2025-06-12 23:21:12');
INSERT INTO `prediction_results` VALUES (2, 1, 0.8600, 0.8500, 1.1760, 'v1.3.1', '2025-06-12 23:21:12');
INSERT INTO `prediction_results` VALUES (3, 2, 0.7700, 0.7800, 1.2820, 'v1.2.0', '2025-06-12 23:21:12');
INSERT INTO `prediction_results` VALUES (4, 3, 0.9100, 0.9200, 1.0870, 'v1.3.1', '2025-06-12 23:21:12');
INSERT INTO `prediction_results` VALUES (5, 4, 1.1800, 1.1500, 2.6090, 'v1.2.0', '2025-06-12 23:21:12');
INSERT INTO `prediction_results` VALUES (6, 5, 1.0000, 1.0200, 1.9610, 'v1.3.1', '2025-06-12 23:21:12');

-- ----------------------------
-- Table structure for stl_files
-- ----------------------------
DROP TABLE IF EXISTS `stl_files`;
CREATE TABLE `stl_files`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `upload_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_size` int NULL DEFAULT NULL,
  `status` enum('uploaded','processing','processed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'uploaded',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_stl_files_patient_id`(`patient_id`) USING BTREE,
  CONSTRAINT `stl_files_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 27 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of stl_files
-- ----------------------------
INSERT INTO `stl_files` VALUES (1, 1, 'patient_1_scan_1.stl', '/data/stl/patient_1/scan_1.stl', '2025-06-12 23:21:12', 2560, 'uploaded');
INSERT INTO `stl_files` VALUES (2, 1, 'patient_1_scan_2.stl', '/data/stl/patient_1/scan_2.stl', '2025-06-12 23:21:12', 3120, 'uploaded');
INSERT INTO `stl_files` VALUES (3, 2, 'patient_2_scan_1.stl', '/data/stl/patient_2/scan_1.stl', '2025-06-12 23:21:12', 2850, 'uploaded');
INSERT INTO `stl_files` VALUES (4, 3, 'patient_3_scan_1.stl', '/data/stl/patient_3/scan_1.stl', '2025-06-12 23:21:12', 3200, 'uploaded');
INSERT INTO `stl_files` VALUES (13, 10, 'type1 Segment_6.stl', 'F:\\Program Files\\Trae workplace\\uploads\\1749757091158-type1 Segment_6.stl', '2025-06-13 03:38:11', 14250784, 'uploaded');
INSERT INTO `stl_files` VALUES (14, 10, 'type1 Segment_4.stl', 'F:\\Program Files\\Trae workplace\\uploads\\1749758468569-type1 Segment_4.stl', '2025-06-13 04:01:08', 14556084, 'uploaded');
INSERT INTO `stl_files` VALUES (15, 10, 'type1 Segment_5.stl', 'F:\\Program Files\\Trae workplace\\uploads\\1749758823428-type1 Segment_5.stl', '2025-06-13 04:07:03', 15938884, 'uploaded');
INSERT INTO `stl_files` VALUES (16, 10, 'type1 Segment_3.stl', 'F:\\Program Files\\Trae workplace\\uploads\\type1 Segment_3.stl', '2025-06-13 04:09:46', 18035184, 'uploaded');
INSERT INTO `stl_files` VALUES (17, 10, 'type1 Segment_1.stl', 'F:\\Program Files\\Trae workplace\\uploads\\type1 Segment_1.stl', '2025-06-13 04:22:52', 15234684, 'uploaded');
INSERT INTO `stl_files` VALUES (18, 11, 'type1 Segment_5.stl', 'F:\\Program Files\\Trae workplace\\uploads\\type1 Segment_5.stl', '2025-06-13 14:40:41', 15938884, 'uploaded');
INSERT INTO `stl_files` VALUES (19, 10, 'type1 Segment_2.stl', 'F:\\Program Files\\Trae workplace\\uploads\\type1 Segment_2.stl', '2025-06-13 16:56:51', 18168084, 'uploaded');
INSERT INTO `stl_files` VALUES (26, 19, 'MaChunLan30.stl', 'F:\\Program Files\\Trae workplace\\uploads\\MaChunLan30.stl', '2025-06-15 18:37:44', 2501984, 'uploaded');

SET FOREIGN_KEY_CHECKS = 1;
