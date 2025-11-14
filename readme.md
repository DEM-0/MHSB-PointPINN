# 颈动脉血流动力学分析系统

## 项目简介

颈动脉血流动力学分析系统是一个集3D模型可视化、STL模型处理、点云转换与AI预测于一体的全栈应用。该系统允许用户上传、查看STL格式的三维模型，将其转换为点云数据，并使用PINN神经网络模型进行血流动力学参数预测。

## 技术栈

### 前端技术
- HTML5/CSS3/JavaScript
- Three.js - 3D模型可视化
- Bootstrap - 界面框架
- ECharts - 数据可视化图表
- Fetch API - 与后端通信

### 后端技术
- Node.js - JavaScript运行环境
- Express.js - Web框架
- MySQL - 关系型数据库
- Multer - 文件上传处理
- Child Process - Python脚本执行

### AI处理模块
- Python - 科学计算和模型处理
- PyTorch - 深度学习框架
- PINN (物理信息神经网络) - 血流动力学预测

## 项目结构

```
├── db/                     # 数据库相关文件
│   ├── index.js            # 数据库连接和操作接口
│   ├── init.sql            # 数据库初始化脚本
│   └── carotid_hemodynamics.sql # 完整数据库结构
├── public/                 # 前端静态文件
│   ├── index.html          # 主页面
│   └── js/
│       └── app.js          # 前端核心逻辑
├── python_scripts/         # Python处理脚本
│   ├── stl2point.py        # STL到点云转换脚本
│   ├── predict 20250610.py # 预测脚本
│   ├── pinn_model.pth      # 预训练PINN模型
│   ├── stl/                # 处理中的STL文件
│   ├── point/              # 生成的点云文件
│   └── resultPoint/        # 预测结果文件
├── routes/                 # API路由
│   ├── files.js            # 文件管理相关路由
│   └── patients.js         # 患者管理相关路由
├── staticFiles/            # 静态文件存储
│   └── stl/                # STL文件存储
├── uploads/                # 上传文件临时存储
├── server.js               # 服务器入口文件
└── package.json            # 项目依赖配置
```

## 核心功能

1. **患者管理**
   - 添加、查询、更新和删除患者信息
   - 患者与文件的关联管理

2. **STL文件管理**
   - STL文件上传和存储
   - 与患者关联的文件管理
   - 文件列表查看和详细信息展示

3. **3D模型可视化**
   - STL文件的实时3D渲染
   - 模型缩放、旋转和平移操作
   - 网格辅助和灯光效果

4. **STL到点云转换**
   - 调用Python脚本将STL文件转换为点云数据
   - 转换过程日志记录
   - 点云文件生成和管理

5. **血流动力学预测**
   - 使用PINN模型对点云数据进行处理
   - 预测血流速度、压力、壁面剪切应力等参数
   - 预测结果可视化展示

6. **数据可视化**
   - 血流动力学参数图表展示
   - 转换日志和操作历史记录
   - 结果数据的动态更新

## 安装与部署

### 环境要求
- Node.js 14.x 或更高版本
- MySQL 5.7 或更高版本
- Python 3.6 或更高版本
- PyTorch 1.7 或更高版本

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/DEM-0/MHSB-PointPINN.git
cd MHSB-PointPINN
```

2. **安装Node.js依赖**
```bash

npm install express mysql multer child_process
```

3. **配置数据库**
   - 创建MySQL数据库：`carotid_hemodynamics`
   - 导入数据库结构：`mysql -u root -p carotid_hemodynamics < db/init.sql`
   - 修改`.env`文件中的数据库连接配置

4. **配置Python环境**
   - 安装PyTorch和相关依赖
   - 确保STL处理所需的Python库已安装

5. **启动服务器**
```bash
npm start
# 或者
node server.js
```

6. **访问应用**
   打开浏览器，访问 `http://localhost:3000`

## 使用说明

### STL文件上传与查看
1. 在主页面选择患者或直接上传STL文件
2. 点击"上传STL文件"按钮选择本地文件
3. 上传成功后，系统会自动加载并显示3D模型

### 点云转换
1. 加载STL模型后，点击"转换为点云"按钮
2. 系统将自动执行以下操作：
   - 将STL文件复制到处理目录
   - 更新Python脚本配置
   - 执行点云转换脚本
   - 生成点云数据文件
3. 转换过程和结果将记录在日志中

### 血流动力学预测
1. 点云转换完成后，系统会自动进行预测分析
2. 预测完成后，结果将通过图表展示，包括：
   - 血流速度分布
   - 压力分布
   - 壁面剪切应力分布
   - 雷诺数

## 配置说明

### 服务器配置
- 端口设置：默认端口为3000，可在`server.js`中修改
- 静态文件路径：`public`和`staticFiles`目录
- 文件上传配置：通过Multer在`server.js`和`routes/files.js`中定义

### 数据库配置
- 连接参数：在`.env`文件中配置数据库连接信息
- 表结构：通过`db/init.sql`初始化数据库表

### Python脚本配置
- 路径设置：在`routes/files.js`中定义Python脚本执行路径
- 文件格式：STL文件转换为点云后，命名规则为`原文件名_point.txt`

## 注意事项

1. **文件权限**
   - 确保Node.js进程有足够权限访问`uploads`、`staticFiles`和`python_scripts`目录

2. **Python环境**
   - 确保系统环境变量中正确配置了Python路径
   - 验证PyTorch和其他依赖库是否正确安装

3. **性能考虑**
   - 大型STL文件可能需要较长的处理时间
   - 建议使用性能较高的服务器进行预测计算

4. **错误处理**
   - 系统包含日志记录功能，可通过浏览器控制台和服务器日志查看详细信息
   - 转换失败时会显示具体错误信息

## 许可证

本项目为内部研究使用，未经授权不得商用。

## 联系方式

如有问题或建议，请联系项目开发团队。