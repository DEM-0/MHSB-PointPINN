import datetime
import torch
import torch.nn as nn
import numpy as np
from pathlib import Path

# 配置参数类
class Config:
    """全局配置参数"""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")  # 自动选择设备（GPU或CPU）
    # timestamp = int(datetime.datetime.now().timestamp())  # 当前时间戳，用于生成唯一的目录
    # result_dir = f"results {datetime.date.today()} {timestamp}"  # 预测结果保存目录
    result_dir = f"F:\Program Files\Trae workplace\python_scripts\\resultPoint"  # 预测结果保存目录
    test_dir = "F:\Program Files\Trae workplace\python_scripts\point"
    test_file_name = "MaChunLan30_point.txt"
    test_file = f"{test_dir}/{test_file_name}"  # 测试数据文件路径
    result_file_name=f"result_{test_file_name}"
    result_file = f"{result_dir}/{result_file_name}"  # 预测结果保存路径
    save_path = f"F:\Program Files\Trae workplace\python_scripts\pinn_model.pth"  # 训练好的模型权重路径
    time_step = 0.01  # CFD模拟的时间步长（秒）
    predict_time = 0.5  # 预测时间

# 物理信息神经网络定义
class PINN(nn.Module):
    """
    物理信息神经网络，用于预测速度分量(u, v, w)和压力(p)
    - 输入：4维 (t, x, y, z)
    - 输出：4维 (u, v, w, p)
    - 结构：6层全连接网络，每层256个神经元，使用Tanh激活函数
    """
    def __init__(self, input_dim=4, output_dim=4):
        super(PINN, self).__init__()
        layers = []
        layers.append(nn.Linear(input_dim, 256))  # 输入层
        layers.append(nn.Tanh())  # 激活函数
        for _ in range(4):  # 4个隐藏层
            layers.append(nn.Linear(256, 256))
            layers.append(nn.Tanh())
        layers.append(nn.Linear(256, output_dim))  # 输出层
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        """前向传播，输入张量x，返回预测结果"""
        return self.net(x)

# 数据处理器类
class DataHandler:
    """处理数据的归一化和反归一化"""
    def __init__(self):
        self.norm_params = {}  # 存储归一化参数（均值和标准差）

    def normalize(self, data, key):
        """
        按列归一化数据
        - data: 输入数据 (N, D)
        - key: 数据类型标识 ('coords' 或 'targets')
        """
        mean = self.norm_params[key]['mean']
        std = self.norm_params[key]['std']
        return (data - mean) / (std + 1e-8)  # 避免除以零

    def denormalize(self, data_norm, key):
        """
        反归一化数据
        - data_norm: 归一化后的数据
        - key: 数据类型标识
        """
        mean = self.norm_params[key]['mean']
        std = self.norm_params[key]['std']
        return data_norm * std + mean

# 测试文件处理函数
def process_test_file(test_path, model_path, result_path):
    """
    使用训练好的模型预测测试数据并保存结果
    - test_path: 测试数据文件路径
    - model_path: 训练好的模型权重文件路径
    - result_path: 预测结果保存路径
    """
    # 加载测试数据，跳过表头
    data = np.loadtxt(test_path, skiprows=1)
    node_numbers = data[:, 0]  # 提取节点编号
    # 从文件名提取时间步数，计算物理时间 t
    # step_str = test_path.split('-')[-1].split('.')[0]
    # step = int(step_str)
    t = Config.predict_time
    coords = np.hstack([np.full((data.shape[0], 1), t), data[:, 1:4]])  # 构建 [t, x, y, z] 坐标数组

    # 加载模型和归一化参数
    checkpoint = torch.load(model_path)  # 加载训练好的权重文件
    data_handler = DataHandler()
    data_handler.norm_params = checkpoint['norm_params']  # 获取归一化参数
    model = PINN().to(Config.device)  # 初始化模型并移动到指定设备
    model.load_state_dict(checkpoint['model_state'])  # 加载模型权重
    model.eval()  # 设置为评估模式

    # 归一化输入坐标
    coords_norm = data_handler.normalize(coords, 'coords')
    coords_tensor = torch.tensor(coords_norm, dtype=torch.float32).to(Config.device)

    # 使用模型进行预测
    with torch.no_grad():  # 禁用梯度计算以节省内存
        pred_norm = model(coords_tensor).cpu().numpy()  # 预测归一化结果

    # 反归一化预测结果
    pred_real = data_handler.denormalize(pred_norm, 'targets')
    u_real, v_real, w_real, p_real = pred_real[:, 0], pred_real[:, 1], pred_real[:, 2], pred_real[:, 3]  # 提取速度和压力
    vm_real = np.sqrt(u_real**2 + v_real**2 + w_real**2)  # 计算速度模量

    # 定义输出文件的表头和格式
    header = "nodenumber     x-coordinate     y-coordinate     z-coordinate     x-velocity     y-velocity     z-velocity     velocity-magnitude     pressure"
    fmt = '%12d   %.10E   %.10E   %.10E   %.10E   %.10E   %.10E   %.10E   %.10E'
    # 保存预测结果到文件
    np.savetxt(result_path, np.column_stack([node_numbers, coords[:, 1:4], u_real, v_real, w_real, vm_real, p_real]),
               fmt=fmt, header=header, comments='')
    print(Config.test_file+"---预测已完成在:"+Config.result_file)

if __name__ == "__main__":
    # 创建结果目录（如果不存在）
    Path(Config.result_dir).mkdir(parents=True, exist_ok=True)
    # 执行预测并保存结果
    process_test_file(Config.test_file, Config.save_path, Config.result_file)