const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fs_ = require('fs');
const { stlFileDB } = require('../db');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');

const staticDir = path.join(__dirname, '../staticFiles/stl');
// 确保目录存在
fs.mkdir(staticDir, { recursive: true });

// 配置multer上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳-原始文件名
    // const uniqueName = `${Date.now()}-${file.originalname}`;
    const uniqueName = `${file.originalname}`;
    cb(null, uniqueName);
  }
});

// 文件过滤 - 只允许STL文件
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/sla' || file.originalname.endsWith('.stl')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传STL格式文件'), false);
  }
};

// 在multer配置中添加
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir); // 原始上传目录
    },
    filename: (req, file, cb) => {
      // const uniqueName = `${Date.now()}-${file.originalname}`；
      const uniqueName = `${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制文件大小为50MB
  }
});

/**
 * @route   POST /api/files/upload
 * @desc    上传STL文件
 * @access  Public
 */
router.post('/upload', upload.single('stlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未选择文件' });
    }

    if (!req.body.patientId) {
      // 删除已上传的文件
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: '患者ID为必填项' });
    }

    // 创建文件记录
    const fileRecord = {
      patient_id: parseInt(req.body.patientId),
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      status: 'uploaded'
    };

    const newFile = await stlFileDB.create(fileRecord);
    
    // 复制文件到静态目录
    const staticPath = path.join(staticDir, path.basename(req.file.path));
    await fs.copyFile(req.file.path, staticPath);

    res.status(201).json({
      message: '文件上传成功',
      file: newFile
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ message: '文件上传失败: ' + error.message });
  }
});

// 复制STL文件到python_scripts/stl目录
router.get('/copy-stl', async (req, res) => {
  try {
    const { filename } = req.query;
    const sourcePath = path.join(__dirname, '../staticFiles/stl', filename);
    const targetPath = path.join(__dirname, '../python_scripts/stl', filename);
    
    console.log(sourcePath);
    console.log(targetPath);

    await fs.copyFile(sourcePath, targetPath);
    res.json({ message: '文件复制成功', path: targetPath });
  } catch (error) {
    console.error('文件复制失败:', error);
    res.status(500).json({ message: '文件复制失败: ' + error.message });
  }
});

// 更新stl2point.py中的路径
router.post('/update-python-path', async (req, res) => {
  try {
    const { filename } = req.body;
    console.log("更新stl名为："+filename)
    const pyPath = path.join(__dirname, '../python_scripts/stl2point.py');
    let content = await fs.readFile(pyPath, 'utf8');
    
    // 更新path变量
    // 更新convertFileName变量 - 精确匹配整行
    const newLine = `convertFileName = "${filename}"`; // 注意添加了等号和空格
    content = content.replace(/convertFileName\s*=\s*".*?"/, newLine); // 使用正则表达式精确匹配
    await fs.writeFile(pyPath, content);
    
    res.json({ message: 'Python脚本更新成功' });
  } catch (error) {
    console.error('Python脚本更新失败:', error);
    res.status(500).json({ message: 'Python脚本更新失败: ' + error.message });
  }
});

// 独立STL文件上传接口，不校验患者ID
router.post('/upload/stl', upload.single('stlFile'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('请上传STL文件');
    }
    
    // 移动文件到uploads目录
    const uploadPath = path.join(__dirname, '..', 'uploads', req.file.filename);
    await fs.rename(req.file.path, uploadPath);
    
    res.status(200).json({
      success: true,
      message: '文件上传成功',
      path: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '文件上传失败: ' + error.message
    });
  }
});

// 确保端点正确处理
router.get('/:id/download', async (req, res) => {
  try {
    const file = await stlFileDB.getById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: '文件不存在' });
    }
    const staticPath = path.join(__dirname, '..', 'staticFiles', 'stl', file.file_name);
    res.download(staticPath, file.file_name);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ message: '文件下载失败' });
  }
});
/**
 * @route   GET /api/files/patient/:patientId
 * @desc    获取患者的所有文件
 * @access  Public
 */
router.get('/patient/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return res.status(400).json({ message: '无效的患者ID' });
    }

    const files = await stlFileDB.getByPatientId(patientId);
    res.json(files);
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ message: '获取文件列表失败: ' + error.message });
  }
});

/**
 * @route   POST /api/files/process/:fileId
 * @desc    处理STL文件（转换为点云）
 * @access  Public
 */
router.post('/process/:fileId', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: '无效的文件ID' });
    }

    // 更新文件状态为处理中
    await stlFileDB.updateStatus(fileId, 'processing');

    // 这里应该调用STL处理服务，实际实现将在后续添加
    // 为了演示，我们直接设置为处理完成
    setTimeout(async () => {
      await stlFileDB.updateStatus(fileId, 'processed');
    }, 3000);

    res.json({ message: '文件处理已启动', fileId });
  } catch (error) {
    console.error('文件处理失败:', error);
    res.status(500).json({ message: '文件处理失败: ' + error.message });
  }
});

// 执行Python脚本转换STL为点云
// 执行Python脚本转换STL为点云
router.post('/run-python-script', async (req, res) => {
    try {
        const { filename } = req.body;
        
        // 1. 确保Python脚本存在
        const pyScriptPath = path.join(__dirname, '../python_scripts/stl2point.py');
        if (!fs_.existsSync(pyScriptPath)) {
            throw new Error('Python脚本不存在');
        }
        
        // 2. 执行Python脚本
        const { exec } = require('child_process');
        const pythonCommand = `E:/pytorch_env/pytorch/python.exe "${pyScriptPath}"`;
        
        exec(pythonCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Python脚本执行失败:', error);
                return res.status(500).json({ 
                    message: '点云转换失败', 
                    error: error.message 
                });
            }
            
            // 3. 检查点云文件是否生成
            const pointCloudPath = path.join(
                __dirname, 
                '../python_scripts/point', 
                filename.replace('.stl', '_point.txt')
            );
            // console.log(pointCloudPath)
            if (!fs_.existsSync(pointCloudPath)) {
              console.log('点云文件未生成');
                return res.status(500).json({ 
                    message: '点云文件未生成', 
                    error: stderr 
                });
            }
            
            // 4. 读取点云文件内容并返回
            try {
                const pointCloudContent = fs_.readFileSync(pointCloudPath, 'utf8');
                res.json({ 
                    message: '点云转换成功',
                    pointCloudContent: pointCloudContent,
                    pointCloudPath:pointCloudPath,
                    stdout: stdout
                });
            } catch (readError) {
                console.error('读取点云文件失败:', readError);
                res.status(500).json({ 
                    message: '读取点云文件失败', 
                    error: readError.message 
                });
            }
        });
    } catch (error) {
        console.error('点云转换失败:', error);
        res.status(500).json({ 
            message: '点云转换失败: ' + error.message 
        });
    }
});

// 更新python_scripts/predict 20250610.py中的路径
router.post('/run-update-prediction', async (req, res) => {
  try {
    let { filename, predictionTime } = req.body;
    filename=filename.slice(0, -4) + "_point.txt";
    console.log("更新预测的文件名为："+filename)
    const pyPath = path.join(__dirname, '../python_scripts/predict 20250610.py');
    let content = await fs.readFile(pyPath, 'utf8');
    
    // 更新path变量
    // 更新convertFileName变量 - 精确匹配整行
    const newLine = `test_file_name = "${filename}"`; // 注意添加了等号和空格
    content = content.replace(/test_file_name\s*=\s*".*?"/, newLine); // 使用正则表达式精确匹配
    // 更新predict_time变量 - 精确匹配整行
    const newLine2 = `predict_time = ${predictionTime}`; // 注意添加了等号和空格
    content = content.replace(/predict_time\s*=\s*".*?"/, newLine2); // 使用正则表达式精确匹配
    await fs.writeFile(pyPath, content);

    res.json({ message: 'Python脚本更新成功' });

  } catch (error) {
    console.error('Python的预测脚本更新失败:', error);
    res.status(500).json({ message: 'Python脚本更新失败: ' + error.message });
  }
});

router.post('/run-predict', async (req, res) => {
  try {
      const { filename } = req.body;
      
      // 1. 确保Python脚本存在
      const pyScriptPath = path.join(__dirname, '../python_scripts/predict 20250610.py');
      if (!fs_.existsSync(pyScriptPath)) {
          throw new Error('Python脚本不存在');
      }
      
      // 2. 执行Python脚本
      const { exec } = require('child_process');
      const pythonCommand = `E:/pytorch_env/pytorch/python.exe "${pyScriptPath}"`;
      
      exec(pythonCommand, (error, stdout, stderr) => {
          if (error) {
              console.error('Python脚本执行失败:', error);
              return res.status(500).json({ 
                  message: '预测失败', 
                  error: error.message 
              });
          }
          
          predictResultName='result_'+filename.slice(0, -4) + "_point.txt";

          
          // 3. 检查点云文件是否生成
          const pointCloudPath = path.join(
              __dirname, 
              '../python_scripts/resultPoint', 
              predictResultName
          );
          console.log(pointCloudPath)
          if (!fs_.existsSync(pointCloudPath)) {
            console.log('点云文件未生成');
              return res.status(500).json({ 
                  message: '点云文件未生成', 
                  error: stderr 
              });
          }
          
          // 4. 读取点云文件内容并返回
          try {
              const pointCloudContent = fs_.readFileSync(pointCloudPath, 'utf8');
              res.json({ 
                  message: '点云转换成功',
                  pointCloudContent: pointCloudContent,
                  pointCloudPath:pointCloudPath,
                  predictResultName:predictResultName,
                  stdout: stdout
              });
          } catch (readError) {
              console.error('读取点云文件失败:', readError);
              res.status(500).json({ 
                  message: '读取点云文件失败', 
                  error: readError.message 
              });
          }
      });
  } catch (error) {
      console.error('点云转换失败:', error);
      res.status(500).json({ 
          message: '点云转换失败: ' + error.message 
      });
  }
});

module.exports = router;