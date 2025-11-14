-- 创建数据库
CREATE DATABASE IF NOT EXISTS carotid_hemodynamics;
USE carotid_hemodynamics;

-- 患者信息表
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  age INT NOT NULL,
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  medical_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- STL文件信息表
CREATE TABLE IF NOT EXISTS stl_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_size INT,
  status ENUM('uploaded', 'processing', 'processed', 'failed') DEFAULT 'uploaded',
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 血流动力学参数表
CREATE TABLE IF NOT EXISTS hemodynamic_parameters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stl_file_id INT NOT NULL,
  velocity DECIMAL(10,4),
  pressure DECIMAL(10,4),
  wall_shear_stress DECIMAL(10,4),
  Reynolds_number DECIMAL(10,4),
  turbulence_intensity DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stl_file_id) REFERENCES stl_files(id) ON DELETE CASCADE
);

-- 预测结果表
CREATE TABLE IF NOT EXISTS prediction_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parameter_id INT NOT NULL,
  predicted_value DECIMAL(10,4),
  actual_value DECIMAL(10,4),
  error DECIMAL(10,4),
  model_version VARCHAR(50),
  prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parameter_id) REFERENCES hemodynamic_parameters(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_stl_files_patient_id ON stl_files(patient_id);
CREATE INDEX idx_hemodynamic_stl_id ON hemodynamic_parameters(stl_file_id);