const mysql = require('mysql2/promise');

// 从环境变量加载数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '0000',
  database: process.env.DB_NAME || 'carotid_hemodynamics',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

/**
 * 执行SQL查询
 * @param {string} sql - SQL语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Object>} 查询结果
 */
async function query(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 患者相关数据库操作
 */
const patientDB = {
  /**
   * 创建新患者
   * @param {Object} patient - 患者信息
   * @returns {Promise<Object>} 新创建的患者记录
   */
  create: async (patient) => {
    const sql = `
      INSERT INTO patients (name, gender, age, height, weight, medical_history)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      patient.name,
      patient.gender,
      patient.age,
      patient.height,
      patient.weight,
      patient.medical_history
    ];
    const result = await query(sql, params);
    return { id: result.insertId, ...patient };
  },

  /**
   * 获取所有患者
   * @returns {Promise<Array>} 患者列表
   */
  getAll: async () => {
    const sql = 'SELECT * FROM patients ORDER BY created_at DESC';
    return query(sql);
  },

  /**
   * 根据ID获取患者
   * @param {number} id - 患者ID
   * @returns {Promise<Object>} 患者信息
   */
  getById: async (id) => {
    const sql = 'SELECT * FROM patients WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * 更新患者信息
   * @param {number} id - 患者ID
   * @param {Object} patient - 更新的患者信息
   * @returns {Promise<Object>} 更新结果
   */
  update: async (id, patient) => {
    const fields = Object.keys(patient).filter(key => !['id', 'created_at', 'updated_at'].includes(key));
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = [...fields.map(field => patient[field]), id];
    const sql = `UPDATE patients SET ${setClause} WHERE id = ?`;
    return query(sql, params);
  },

  /**
   * 删除患者
   * @param {number} id - 患者ID
   * @returns {Promise<Object>} 删除结果
   */
  delete: async (id) => {
    const sql = 'DELETE FROM patients WHERE id = ?';
    return query(sql, [id]);
  }
};

/**
 * STL文件相关数据库操作
 */
const stlFileDB = {
  /**
   * 创建STL文件记录
   * @param {Object} file - 文件信息
   * @returns {Promise<Object>} 新创建的文件记录
   */
  create: async (file) => {
    const sql = `
      INSERT INTO stl_files (patient_id, file_name, file_path, file_size, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      file.patient_id,
      file.file_name,
      file.file_path,
      file.file_size,
      file.status || 'uploaded'
    ];
    const result = await query(sql, params);
    return { id: result.insertId, ...file };
  },

  /**
   * 根据患者ID获取文件列表
   * @param {number} patientId - 患者ID
   * @returns {Promise<Array>} 文件列表
   */
  getByPatientId: async (patientId) => {
    const sql = 'SELECT * FROM stl_files WHERE patient_id = ? ORDER BY upload_time DESC';
    return query(sql, [patientId]);
  },

  /**
   * 更新文件状态
   * @param {number} id - 文件ID
   * @param {string} status - 文件状态
   * @returns {Promise<Object>} 更新结果
   */
  updateStatus: async (id, status) => {
    const sql = 'UPDATE stl_files SET status = ? WHERE id = ?';
    return query(sql, [status, id]);
  },

  /**
   * 根据ID获取文件信息
   * @param {number} id - 文件ID
   * @returns {Promise<Object>} 文件信息
   */
  getById: async (id) => {
    const sql = 'SELECT * FROM stl_files WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  }
};

/**
 * 血流动力学参数相关数据库操作
 */
const parameterDB = {
  /**
   * 创建血流动力学参数记录
   * @param {Object} params - 参数信息
   * @returns {Promise<Object>} 新创建的参数记录
   */
  create: async (params) => {
    const sql = `
      INSERT INTO hemodynamic_parameters (
        stl_file_id, velocity, pressure, wall_shear_stress,
        Reynolds_number, turbulence_intensity
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const parameters = [
      params.stl_file_id,
      params.velocity,
      params.pressure,
      params.wall_shear_stress,
      params.Reynolds_number,
      params.turbulence_intensity
    ];
    const result = await query(sql, parameters);
    return { id: result.insertId, ...params };
  },

  /**
   * 根据STL文件ID获取参数
   * @param {number} fileId - 文件ID
   * @returns {Promise<Object>} 参数信息
   */
  getByFileId: async (fileId) => {
    const sql = 'SELECT * FROM hemodynamic_parameters WHERE stl_file_id = ?';
    const results = await query(sql, [fileId]);
    return results[0] || null;
  }
};

/**
 * 预测结果相关数据库操作
 */
const predictionDB = {
  /**
   * 创建预测结果记录
   * @param {Object} result - 预测结果
   * @returns {Promise<Object>} 新创建的预测结果记录
   */
  create: async (result) => {
    const sql = `
      INSERT INTO prediction_results (
        parameter_id, predicted_value, actual_value, error, model_version
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      result.parameter_id,
      result.predicted_value,
      result.actual_value,
      result.error,
      result.model_version
    ];
    const res = await query(sql, params);
    return { id: res.insertId, ...result };
  },

  /**
   * 根据参数ID获取预测结果
   * @param {number} parameterId - 参数ID
   * @returns {Promise<Array>} 预测结果列表
   */
  getByParameterId: async (parameterId) => {
    const sql = 'SELECT * FROM prediction_results WHERE parameter_id = ?';
    return query(sql, [parameterId]);
  }
};

module.exports = {
  query,
  patientDB,
  stlFileDB,
  parameterDB,
  predictionDB,
  pool
};
