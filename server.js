require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 添加静态文件服务（确保在路由之前）
app.use(express.static(path.join(__dirname, 'public')));

// 添加默认路由（可选）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MySQL数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000', // 请替换为实际密码
  database: 'carotid_hemodynamics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL数据库连接成功');
    connection.release();
  } catch (err) {
    console.error('数据库连接失败:', err);
  }
}

testDbConnection();

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    // 确保上传目录存在
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 导入路由模块
const patientsRouter = require('./routes/patients');
const filesRouter = require('./routes/files');

// 挂载路由
app.use('/api/patients', patientsRouter);
app.use('/api/files', filesRouter);

// 确保uploads目录存在
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;