import trimesh
import numpy as np
from pathlib import Path
import os

def stl_to_pointcloud_txt(stl_path, sample_points=5000, scale=1.0):
    """
    从 STL 采样点云，并整体放缩后输出。
    :param stl_path: 输入 STL 文件路径
    :param sample_points: 采样点数
    :param scale: 坐标缩放因子
    """
    stl_file = Path(stl_path)
    output_dir = Path("F:\Program Files\Trae workplace\python_scripts\point")  # 输出文件夹
    output_dir.mkdir(parents=True, exist_ok=True)  # 确保输出文件夹存在
    output_path = output_dir / f"{stl_file.stem}_point.txt"

    mesh = trimesh.load_mesh(stl_path)
    points, _ = trimesh.sample.sample_surface(mesh, sample_points)
    points = np.unique(points, axis=0)

    points *= scale  # 坐标放缩

    with open(output_path, 'w') as f:
        f.write("nodenumber     x-coordinate     y-coordinate     z-coordinate\n")
        for i, (x, y, z) in enumerate(points, 1):
            f.write(f"{i:10d}   {x: .10E}   {y: .10E}   {z: .10E}\n")

    print(f"已生成点云文件：{output_path}（共 {len(points)} 个点）")

if __name__ == "__main__":
    # 确保路径正确，使用绝对路径或相对路径
    convertFileName = "MaChunLan30.stl"
    stl_path = os.path.join("F:\Program Files\Trae workplace\python_scripts\stl", convertFileName)  # 使用os.path正确拼接路径
    print(stl_path)
    # 检查文件是否存在
    if not os.path.exists(stl_path):
        print(f"错误：文件 {stl_path} 不存在！")
        exit(1)

    print(f"正在处理文件：{stl_path}")
    stl_to_pointcloud_txt(
        stl_path,
        sample_points=20000,
        scale=0.001
    )
    print("转换成功！模型已保存为点云数据")