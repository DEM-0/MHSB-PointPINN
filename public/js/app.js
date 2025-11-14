document.addEventListener('DOMContentLoaded', function () {
    // API基础URL
    // 确保API_BASE_URL在全局作用域可用
    const API_BASE_URL = 'http://localhost:3000/api';
    window.API_BASE_URL = API_BASE_URL;
    updateLogDisplay();
    // 全局变量
    let currentPatientId = null;
    let currentFileId = null;
    let stlViewer = {
        scene: null,
        camera: null,
        renderer: null,
        mesh: null,
        controls: null,
        currentModel: null
    };
    let selectedModelPath = null;
    stlViewer = initSTLViewer()
    // 初始化Three.js查看器
    function initSTLViewer() {
        const container = document.getElementById('stlViewer');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf9f9f9);

        // 相机
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 50;

        // 渲染器
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // 灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 1);
        scene.add(directionalLight);

        // 辅助网格
        const gridHelper = new THREE.GridHelper(100, 10);
        scene.add(gridHelper);

        // 动画循环
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();

        // 窗口大小调整
        window.addEventListener('resize', function () {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        return {
            scene: scene,
            camera: camera,
            renderer: renderer,
            container: container,
            mesh: null
        };
    }

    // 点云转换日志
    // const pointCloudLogs = [];

    // 更新日志显示
    function updateLogDisplay() {
        const logContainer = document.getElementById('point-cloud-logs');
        if (logContainer) {
            const logs = JSON.parse(localStorage.getItem('pointCloudLogs') || '[]');
            logContainer.innerHTML = logs.length > 0
                ? logs.map(log => `<div class="log-entry">${log}</div>`).join('')
                : '<div class="log-entry">暂时没有日志</div>';
        }
    }

    // 添加日志
    function addLog(message) {
        const logs = JSON.parse(localStorage.getItem('pointCloudLogs') || '[]');
        logs.push(`${new Date().toLocaleString()}: ${message}`);
        localStorage.setItem('pointCloudLogs', JSON.stringify(logs));
        updateLogDisplay();
    }

    // 处理文件上传
    function handleFileUpload(file) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const formData = new FormData();
        formData.append('stlFile', file, fileName);

        fetch(`${API_BASE_URL}/files/upload/stl`, {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('文件上传成功！');
                    const fileInfo = {
                        file_name: file.name,
                        upload_time: timestamp,
                        file_size: file.size
                    };
                    loadSTLModel(`/uploads/${fileName}`, fileInfo);

                    // 添加上传日志
                    // pointCloudLogs.unshift(`[${new Date().toLocaleString()}] 上传文件: ${file.name} 成功`);
                    updateLogDisplay();

                    // 启用转换按钮
                    document.getElementById('convert-to-point-cloud').disabled = false;
                } else {
                    throw new Error(data.message || '上传失败');
                }
            })
            .catch(error => {
                console.error('上传错误:', error);
                alert(`上传失败: ${error.message}`);
            });
    }

    // 初始化文件上传事件
    document.getElementById('upload-stl-btn').addEventListener('click', () => {
        const fileInput = document.getElementById('stl-upload');
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        } else {
            alert('请先选择STL文件');
        }
    });

    // 加载STL模型
    function loadSTLModel(path, fileInfo) {
        if (!stlViewer) {
            stlViewer = initSTLViewer();
        } else if (stlViewer.mesh) {
            // 移除现有模型
            stlViewer.scene.remove(stlViewer.mesh);
        }
        // 显示模型信息
        const modelInfoContainer = document.getElementById('model-info');
        stlViewer.patient_id = fileInfo.patient_id;
        stlViewer.file_name = fileInfo.file_name;
        stlViewer.upload_time = fileInfo.upload_time;
        stlViewer.file_size = fileInfo.file_size;

        if (modelInfoContainer && fileInfo) {
            disinfo = null
            if (fileInfo.patient_id == undefined) {
                disinfo = '<p class="card-text"><strong>来源：</strong> 来自上传按钮，无需关联患者</p>'
            } else {
                disinfo = `<p class="card-text"><strong>患者ID:</strong> ${fileInfo.patient_id}</p>`
            }
            modelInfoContainer.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">模型信息</h5>
                        <div class="patient-Info-box">
                            <p class="card-text"><strong>文件名:</strong> ${fileInfo.file_name}</p>
                            ${disinfo}
                            <p class="card-text"><strong>上传时间:</strong> ${new Date(fileInfo.upload_time).toLocaleString()}</p>
                            <p class="card-text"><strong>文件大小:</strong> ${formatFileSize(fileInfo.file_size)}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // 启用转换为点云按钮
        const convertBtn = document.getElementById('convert-to-point-cloud');
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.setAttribute('background-color', 'blue');
            convertBtn.addEventListener('click', async () => {
                if (!stlViewer.currentModel) {
                    alert('请先加载模型');
                    return;
                }
                const stlName = stlViewer.file_name;

                // 复制文件到python_scripts/stl目录
                try {
                    const response = await fetch(`/api/files/copy-stl?filename=${stlName}`);
                    if (!response.ok) throw new Error('文件复制失败');

                    // 更新stl2point.py中的路径
                    const pyResponse = await fetch('/api/files/update-python-path', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: stlName })
                    });

                    if (!pyResponse.ok) throw new Error('Python脚本更新失败')
                    else console.log(('Python脚本更新成功'));

                    // 执行转换
                    convertToPointCloud(path, fileInfo);

                } catch (error) {
                    console.error('转换准备失败:', error);
                    alert('转换准备失败: ' + error.message);
                }
            });
        }

        const loader = new THREE.STLLoader();
        loader.load(path, function (geometry) {
            const material = new THREE.MeshPhongMaterial({
                color: 0x0d6efd,
                specular: 0x111111,
                shininess: 200
            });

            const mesh = new THREE.Mesh(geometry, material);

            // 计算模型中心和尺寸
            geometry.computeBoundingBox();
            const boundingBox = geometry.boundingBox;
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            const size = new THREE.Vector3();
            boundingBox.getSize(size);

            // 居中模型并调整大小
            mesh.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 40 / maxDim;
            mesh.scale.set(scale, scale, scale);

            if (stlViewer.scene) {
                stlViewer.scene.add(mesh);
                stlViewer.mesh = mesh;
                stlViewer.currentModel = {
                    path: path,
                    filename: path.split('/').pop(),
                    fileInfo: fileInfo
                };
            } else {
                console.error('场景未初始化');
                throw new Error('场景未初始化，无法加载模型');
            }

            // 添加轨道控制器
            if (!stlViewer.controls) {
                const controls = new THREE.OrbitControls(stlViewer.camera, stlViewer.renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.25;
                stlViewer.controls = controls;

                function animateWithControls() {
                    requestAnimationFrame(animateWithControls);
                    controls.update();
                    stlViewer.renderer.render(stlViewer.scene, stlViewer.camera);
                }
                animateWithControls();
            }
        }, undefined, function (error) {
            console.error('加载STL模型失败:', error);
            alert('加载模型失败: ' + error.message);
        });
    }

    // 转换为点云
    async function convertToPointCloud(path, fileInfo) {
        addLog(`开始转换模型: ${fileInfo.file_name}`);

        try {
            // 1. 执行Python脚本转换STL为点云
            const response = await fetch(`${API_BASE_URL}/files/run-python-script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: fileInfo.file_name })
            });

            if (!response.ok) throw new Error('点云转换失败');

            // 2. 获取转换后的点云文件路径
            const result = await response.json();
            const pointCloudContent = result.pointCloudContent; // 获取点云文件内容
            const pointCloudPath = result.pointCloudPath; // 获取点云文件路径
            const pointCloudFileName = fileInfo.file_name;  // 获取点云文件名

            // 3. 记录转换成功日志
            addLog(`转换成功: ${fileInfo.file_name}`);

            // 4. 显示转换成功提示
            alert(`点云转换成功`);
            // 5. 使用Three.js加载和展示点云数据，加载进这个盒子里
            loadAndDisplayPointCloud(pointCloudContent, 'convert-point-show');
            // 5. 返回点云文件路径供后续可视化使用
            // return pointCloudPath;
            // 6.激活运行预测模型
            activatePrediction(pointCloudFileName);

        } catch (error) {
            console.error('点云转换失败:', error);
            addLog(`转换失败: ${fileInfo.file_name} - ${error.message}`);
            alert(`点云转换失败: ${error.message}`);
            throw error;
        }
    }


    function updateLabel(val) {
        document.getElementById('range-value').innerText = val;
        // 在这里你可以根据val加载对应的模型或数据
    }

    // 获取滑块元素
    const predictionRange = document.getElementById('prediction-range');
    // 初始设置值
    updateLabel(predictionRange.value);
    // 添加正确的事件监听器
    predictionRange.addEventListener('input', function () {
        updateLabel(this.value);
    });

    function activatePrediction(pointCloudFileName) {
        // 获取按钮元素
        const button = document.getElementById('run-prediction');

        // 移除按钮的 disabled 属性
        button.disabled = false;

        // 为按钮添加点击事件监听器
        button.addEventListener('click', function () {
            // 输出提示信息
            alert('预测模型已启动！');
            console.log('预测模型已启动！');
            // 获取滑块元素
            const predictionRange = document.getElementById('prediction-range');
            // 获取滑块值
            const predictionTime = predictionRange.value;
            console.log(`滑块值: ${predictionTime}`);
            // 发送请求到后端

            fetch('/api/files/run-update-prediction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: pointCloudFileName, predictionTime: predictionTime })
            }).then(response => {
                if (!response.ok) throw new Error(`更新预测文件中${pointCloudFileName}地址,运行时间为${predictionTime}失败`);
                return response.json(); // 返回解析后的 JSON 数据
            }).then(data => {
                // 1. 执行Python脚本预测为点云
                return fetch('/api/files/run-predict', { // 使用 return 确保链式调用
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: pointCloudFileName })
                });
            }).then(response => {
                if (!response.ok) throw new Error('预测模型运行失败');
                return response.json(); // 返回解析后的 JSON 数据
            }).then(data => {
                // 2. 获取预测后的点云文件路径
                const pointCloudContent = data.pointCloudContent; // 获取点云文件内容
                const pointCloudPath = data.pointCloudPath; // 获取点云文件路径
                const predictResultName = data.predictResultName; // 获取点云文件名
                // 获取滑块元素
                const predictionRange = document.getElementById('prediction-range');
                // 获取滑块值
                const predictionTime = predictionRange.value; //获取点云预测时间
                // console.log(pointCloudContent);
                document.querySelector('.model-info-name').innerText = predictResultName;
                document.querySelector('.model-predict-info-time').innerText = predictionTime;
                // 4. 显示转换成功提示
                alert(`预测${predictionTime}成功`);
                console.log(`预测${predictionTime}成功:`, data);

                // 处理预测结果
                loadAndDisplayPointCloud(pointCloudContent, 'velocity-chart', true, false);
                // console.log(document.getElementById('speed-chart'));

                loadAndDisplayPointCloud(pointCloudContent, 'pressure-chart', true, true);

            }).catch(error => {
                console.error('预测模型运行失败:', error);
                alert('预测模型运行失败: ' + error.message);
            });
        });
    }

    // 初始化点云查看器
    function initPointCloudViewer(boxId) {
        const container = document.getElementById(boxId);
        console.log(container)
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf9f9f9);

        // 相机设置
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 50; // 初始相机位置

        // 渲染器设置
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 1);
        scene.add(directionalLight);

        // 添加网格辅助线
        const gridHelper = new THREE.GridHelper(100, 10);
        scene.add(gridHelper);

        // 添加控制器
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.update();

        // 动画循环
        function animate() {
            requestAnimationFrame(animate);
            controls.update(); // 更新控制器状态
            renderer.render(scene, camera);
        }
        animate();

        // 窗口大小调整
        window.addEventListener('resize', function () {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        return {
            scene: scene,
            camera: camera,
            renderer: renderer,
            container: container,
            pointCloud: null,
            // controls: controls
        };
    }

    // 旧加载并展示点云数据
    // function loadAndDisplayPointCloud(pointCloudData,boxId) {
    //     const viewer = initPointCloudViewer(boxId); // 初始化查看器
    //     const points = parsePointCloudData(pointCloudData); // 解析点云数据

    //     // 归一化点云数据
    //     normalizePoints(points);

    //     // 调整相机位置到点云中心
    //     adjustCameraToPointCloud(viewer.camera, points);

    //     // 如果有解析出的点
    //     if (points && points.length > 0) {
    //         // 创建点云几何体和材质
    //         const geometry = new THREE.BufferGeometry().setFromPoints(points);
    //         const material = new THREE.PointsMaterial({
    //             color: 0x0000ff, // 设置合适的颜色
    //             size: 0.5, // 增大点的尺寸
    //             transparent: true,
    //             opacity: 0.8
    //         });

    //         // 创建点云对象
    //         viewer.pointCloud = new THREE.Points(geometry, material);
    //         viewer.scene.add(viewer.pointCloud); // 将点云添加到场景中
    //     } else {
    //         console.error('没有点云数据可供显示');
    //     }
    // }
    // 无colorbar加载并展示点云数据
    // function loadAndDisplayPointCloud(pointCloudData, boxId, usePrediction = false) {
    //     const viewer = initPointCloudViewer(boxId); // 初始化查看器
    //     const parsedData = parsePointCloudData(pointCloudData, usePrediction); // 解析点云数据

    //     const points = parsedData.points;
    //     const magnitudes = parsedData.magnitudes;

    //     // 归一化点云数据
    //     normalizePoints(points);

    //     // 调整相机位置到点云中心
    //     adjustCameraToPointCloud(viewer.camera, points);

    //     // 如果有解析出的点
    //     if (points && points.length > 0) {
    //         // 创建点云几何体
    //         const geometry = new THREE.BufferGeometry().setFromPoints(points);

    //         // 如果需要使用预测数据设置颜色
    //         if (usePrediction && magnitudes.length > 0) {
    //             // 创建颜色数组
    //             const colors = [];
    //             const minMagnitude = Math.min(...magnitudes);
    //             const maxMagnitude = Math.max(...magnitudes);

    //             for (let i = 0; i < points.length; i++) {
    //                 // 根据 magnitude 映射颜色（这里使用蓝色到红色的渐变）
    //                 const color = new THREE.Color();
    //                 const t = (magnitudes[i] - minMagnitude) / (maxMagnitude - minMagnitude);
    //                 color.setHSL(0.6 - t * 0.6, 1, 0.5); // 蓝色到红色的渐变
    //                 colors.push(color.r, color.g, color.b);
    //             }

    //             geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    //         }

    //         // 创建点云材质
    //         const material = new THREE.PointsMaterial({
    //             size: 0.5, // 增大点的尺寸
    //             transparent: true,
    //             opacity: 0.8
    //         });

    //         if (usePrediction) {
    //             material.vertexColors = true; // 启用顶点颜色
    //         } else {
    //             material.color = new THREE.Color(0x0000ff); // 默认蓝色
    //         }

    //         // 创建点云对象
    //         viewer.pointCloud = new THREE.Points(geometry, material);
    //         viewer.scene.add(viewer.pointCloud); // 将点云添加到场景中
    //     } else {
    //         console.error('没有点云数据可供显示');
    //     }
    // }
    function loadAndDisplayPointCloud(pointCloudData, boxId, usePrediction = false, isPressure = false) {
        const container = document.getElementById(boxId);
        console.log("清空原来的3D容器：" + container)

        container.innerHTML = ''; // 清空所有子元素和内容
        console.log("原来的3D容器清空成功：" + container)

        const viewer = initPointCloudViewer(boxId); // 初始化查看器
        const parsedData = parsePointCloudData(pointCloudData, usePrediction, isPressure ? 8 : 7); // 解析点云数据

        const points = parsedData.points;
        const magnitudes = parsedData.magnitudes;

        // 归一化点云数据
        normalizePoints(points);

        // 调整相机位置到点云中心
        adjustCameraToPointCloud(viewer.camera, points);

        // 如果有解析出的点
        if (points && points.length > 0) {
            // 创建点云几何体
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // 如果需要使用预测数据设置颜色
            if (usePrediction && magnitudes.length > 0) {
                // 创建颜色数组
                const colors = [];
                const minMagnitude = Math.min(...magnitudes);
                const maxMagnitude = Math.max(...magnitudes);

                for (let i = 0; i < points.length; i++) {
                    // 归一化值 t，将 magnitudes[i] 映射到 [0, 1]
                    const t = (magnitudes[i] - minMagnitude) / (maxMagnitude - minMagnitude);
                    const color = new THREE.Color();

                    if (isPressure) {
                        // 压力：蓝色（低） -> 绿色（中） -> 红色（高）
                        if (t < 0.5) {
                            // 蓝色到绿色，H 从 0.6（蓝色）到 0.33（绿色）
                            color.setHSL(0.6 - t * 0.54, 1, 0.5);
                        } else {
                            // 绿色到红色，H 从 0.33（绿色）到 0（红色）
                            color.setHSL(0.33 - (t - 0.5) * 0.66, 1, 0.5);
                        }
                    } else {
                        // 速度：蓝色（低） -> 绿色（中） -> 黄色（中高） -> 红色（高）
                        if (t < 0.33) {
                            // 蓝色到绿色，H 从 0.6（蓝色）到 0.33（绿色）
                            color.setHSL(0.6 - t * 0.81, 1, 0.5);
                        } else if (t < 0.66) {
                            // 绿色到黄色，H 从 0.33（绿色）到 0.16（黄色）
                            color.setHSL(0.33 - (t - 0.33) * 0.515, 1, 0.5);
                        } else {
                            // 黄色到红色，H 从 0.16（黄色）到 0（红色）
                            color.setHSL(0.16 - (t - 0.66) * 0.485, 1, 0.5);
                        }
                    }

                    // 将颜色添加到数组，仅添加一次
                    colors.push(color.r, color.g, color.b);
                }
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            }
            // 如果需要使用预测数据设置颜色
            // if (usePrediction && magnitudes.length > 0) {
            //     // 创建颜色数组
            //     const colors = [];
            //     const minMagnitude = Math.min(...magnitudes);
            //     const maxMagnitude = Math.max(...magnitudes);

            //     // 根据是否是压力数据选择颜色映射
            //     const colorFunction = isPressure
            //         ? (t) => new THREE.Color().setHSL(0.6 - t * 0.3, 1, 0.5) // 蓝色到绿色
            //         : (t) => new THREE.Color().setHSL(0.6 - t * 0.6, 1, 0.5); // 蓝色到红色

            //     for (let i = 0; i < points.length; i++) {
            //         const t = (magnitudes[i] - minMagnitude) / (maxMagnitude - minMagnitude);
            //         // const color = colorFunction(t);
            //         // colors.push(color.r, color.g, color.b);
            //         const color = new THREE.Color();

            //         if (isPressure) {
            //             // 压力的颜色映射：蓝色到绿色
            //             color.setHSL(0.6 - t * 0.2, 1, 0.5);
            //         } else {
            //             // 速度的颜色映射：蓝色到黄色到红色
            //             // 速度的颜色映射：蓝色到黄色到红色
            //             if (t < 0.5) {
            //                 color.setHSL(0.66 - t * 0.33, 1, 0.5); // 蓝色到黄色
            //             } else {
            //                 color.setHSL(0.33 - (t - 0.5) * 0.16, 1, 0.5); // 黄色到红色
            //             }
            //         }

            //         colors.push(color.r, color.g, color.b);
            //     }

            //     geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            // }

            // 创建点云材质
            const material = new THREE.PointsMaterial({
                size: 0.1, // 增大点的尺寸
                transparent: true,
                opacity: 0.8
            });

            if (usePrediction) {
                material.vertexColors = true; // 启用顶点颜色
            } else {
                material.color = new THREE.Color(0x0000ff); // 默认蓝色
            }

            // 创建点云对象
            viewer.pointCloud = new THREE.Points(geometry, material);
            viewer.scene.add(viewer.pointCloud); // 将点云添加到场景中

            // 添加颜色条形柱
            if (usePrediction && magnitudes.length > 0) {
                const minMagnitude = Math.min(...magnitudes);
                const maxMagnitude = Math.max(...magnitudes);

                // 根据容器 ID 设置颜色条形柱
                if (boxId === 'velocity-chart') {
                    createColorBar(minMagnitude, maxMagnitude, isPressure, 'velocity-chart-color-bar', 'velocity-max-title', 'velocity-min-title');
                } else if (boxId === 'pressure-chart') {
                    createColorBar(minMagnitude, maxMagnitude, isPressure, 'pressure-chart-color-bar', 'pressure-max-title', 'pressure-min-title');
                }
            }
        } else {
            console.error('没有点云数据可供显示');
        }
    }
    // 获取按钮和文本区域元素
    const submitButton = document.querySelector('.jianyibutton');
    const textarea = document.getElementById('yishengshurukuang');
    console.log(textarea)
    // 为按钮添加点击事件监听器
    submitButton.addEventListener('click', function () {
        // 弹出提示框
        alert('提交成功');

        // 清空文本区域的内容
        textarea.value = '';
    });
    // 旧解析点云数据
    // function parsePointCloudData(data) {
    //     const lines = data.trim().split('\n');
    //     const points = [];

    //     for (let i = 1; i < lines.length; i++) { // 从第二行开始（跳过表头）
    //         const line = lines[i].trim();
    //         if (line === '') continue;

    //         const matches = line.match(/[-+]?\d*\.?\d+E?[-+]?[0-9]*/g); // 匹配科学计数法
    //         if (matches && matches.length >= 4) { // 确保有至少4个数字（节点编号+三个坐标）
    //             try {
    //                 const x = parseFloat(matches[1]); // x坐标
    //                 const y = parseFloat(matches[2]); // y坐标
    //                 const z = parseFloat(matches[3]); // z坐标

    //                 if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
    //                     points.push(new THREE.Vector3(x, y, z));
    //                 }
    //             } catch (error) {
    //                 console.error('解析点云数据时出错:', error, '在行:', line);
    //             }
    //         }
    //     }

    //     return points;
    // }
    function parsePointCloudData(data, usePrediction, column = 7) {
        const lines = data.trim().split('\n');
        const points = [];
        const magnitudes = []; // 存储每个点的 velocity-magnitude

        for (let i = 1; i < lines.length; i++) { // 从第二行开始（跳过表头）
            const line = lines[i].trim();
            if (line === '') continue;

            const matches = line.match(/[-+]?\d*\.?\d+E?[-+]?[0-9]*/g); // 匹配科学计数法
            if (matches && matches.length >= 4) { // 确保有至少4个数字（节点编号+三个坐标）
                try {
                    const x = parseFloat(matches[1]); // x坐标
                    const y = parseFloat(matches[2]); // y坐标
                    const z = parseFloat(matches[3]); // z坐标

                    const magnitude = usePrediction && matches.length >= 8 ? parseFloat(matches[column]) : null; // 提取 velocity-magnitude （第8列）

                    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        points.push(new THREE.Vector3(x, y, z));
                        magnitudes.push(magnitude);
                    }
                } catch (error) {
                    console.error('解析点云数据时出错:', error, '在行:', line);
                }
            }
        }

        return {
            points: points,
            magnitudes: magnitudes
        };
    }

    // 归一化点云数据到固定范围
    function normalizePoints(points) {
        if (points.length === 0) return;

        const bounds = {
            min: new THREE.Vector3(Infinity, Infinity, Infinity),
            max: new THREE.Vector3(-Infinity, -Infinity, -Infinity)
        };

        // 计算点云的边界框
        for (const point of points) {
            bounds.min.x = Math.min(bounds.min.x, point.x);
            bounds.min.y = Math.min(bounds.min.y, point.y);
            bounds.min.z = Math.min(bounds.min.z, point.z);
            bounds.max.x = Math.max(bounds.max.x, point.x);
            bounds.max.y = Math.max(bounds.max.y, point.y);
            bounds.max.z = Math.max(bounds.max.z, point.z);
        }

        const center = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
        const size = bounds.max.clone().sub(bounds.min);
        const maxDim = Math.max(size.x, size.y, size.z);

        // 归一化点云数据到固定范围（例如-5到5）
        const scale = 10 / maxDim;
        for (const point of points) {
            point.sub(center).multiplyScalar(scale);
        }
    }

    // 调整相机位置到点云中心
    function adjustCameraToPointCloud(camera, points) {
        if (points.length === 0) return;

        const bounds = {
            min: new THREE.Vector3(Infinity, Infinity, Infinity),
            max: new THREE.Vector3(-Infinity, -Infinity, -Infinity)
        };

        // 计算点云的边界框
        for (const point of points) {
            bounds.min.x = Math.min(bounds.min.x, point.x);
            bounds.min.y = Math.min(bounds.min.y, point.y);
            bounds.min.z = Math.min(bounds.min.z, point.z);
            bounds.max.x = Math.max(bounds.max.x, point.x);
            bounds.max.y = Math.max(bounds.max.y, point.y);
            bounds.max.z = Math.max(bounds.max.z, point.z);
        }

        // 计算点云的中心点和尺寸
        const center = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
        const size = bounds.max.clone().sub(bounds.min);
        const maxDim = Math.max(size.x, size.y, size.z);

        // 将相机位置设置为点云中心后方
        camera.position.copy(center);
        camera.position.z += maxDim * 2; // 相机距离点云中心的距离
        camera.lookAt(center); // 相机看向点云中心
    }

    function createColorBar(minValue, maxValue, isPressure, colorBarId, maxValueTitleId, minValueTitleId) {
        const colorBarContainer = document.getElementById(colorBarId);
        const maxValueTitle = document.getElementById(maxValueTitleId);

        const minValueTitle = document.getElementById(minValueTitleId);

        const canvas = document.createElement('canvas');
        canvas.width = 40;  // 宽度变窄
        canvas.height = 300;  // 高度变长
        const ctx = canvas.getContext('2d');

        // 创建线性渐变（竖直方向）
        // const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        // if (isPressure) {
        //     // 压力：蓝色 -> 绿色 -> 红色
        //     gradient.addColorStop(0, '#FF0000'); // 红色（高）
        //     gradient.addColorStop(0.5, '#00FF00'); // 绿色（中）
        //     gradient.addColorStop(1, '#0000FF'); // 蓝色（低）
        // } else {
        //     // 速度：蓝色 -> 绿色 -> 黄色 -> 红色
        //     gradient.addColorStop(0, '#FF0000'); // 红色（高）
        //     gradient.addColorStop(0.33, '#00FF00'); // 绿色（中低）
        //     gradient.addColorStop(0.66, '#FFFF00'); // 黄色（中高）
        //     gradient.addColorStop(1, '#0000FF'); // 蓝色（低）
        // }
        // 把 (0,0)→(0,h) 改成 (0,h)→(0,0)，
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);

        // 压力：底部（低）→蓝, 中 → 绿, 顶部（高）→红
        if (isPressure) {
            gradient.addColorStop(0, '#0000FF');  // 蓝（低）
            gradient.addColorStop(0.5, '#00FF00'); // 绿（中）
            gradient.addColorStop(1, '#FF0000');   // 红（高）
        } else {
            // 速度：底部（低）→蓝, 中低 → 绿, 中高 → 黄, 顶部（高）→红
            gradient.addColorStop(0, '#0000FF');   // 蓝（低）
            gradient.addColorStop(0.33, '#00FF00'); // 绿（中低）
            gradient.addColorStop(0.66, '#FFFF00'); // 黄（中高）
            gradient.addColorStop(1, '#FF0000');    // 红（高）
        }



        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 清空并设置最大值和最小值标题
        maxValueTitle.textContent = `最大值: ${maxValue.toFixed(3)}`;
        minValueTitle.textContent = `最小值: ${minValue.toFixed(3)}`;

        // 将canvas元素添加到颜色条形柱容器
        colorBarContainer.innerHTML = ''; // 清空容器
        colorBarContainer.appendChild(canvas);

        // 设置canvas的样式使其竖直显示
        canvas.style.transform = 'rotate(0deg)'; // 确保画布不旋转
        colorBarContainer.style.display = 'flex';
        colorBarContainer.style.flexDirection = 'column';
        colorBarContainer.style.justifyContent = 'space-between';
    }

    // 初始化ECharts图表
    function initCharts() {
        // 速度分布图表
        const velocityChart = echarts.init(document.getElementById('velocity-chart'));
        // 压力分布图表
        const pressureChart = echarts.init(document.getElementById('pressure-chart'));
        // 壁面剪切应力图表
        const shearStressChart = echarts.init(document.getElementById('shear-stress-chart'));
        // 雷诺数图表
        const reynoldsChart = echarts.init(document.getElementById('reynolds-chart'));

        // 设置默认图表配置
        const defaultOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['入口', '狭窄处', '出口']
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                data: [0, 0, 0],
                type: 'bar',
                showBackground: true,
                backgroundStyle: {
                    color: 'rgba(180, 180, 180, 0.2)'
                }
            }]
        };

        // 设置默认数据
        velocityChart.setOption({ ...defaultOption, title: { text: '血流速度 (m/s)' } });
        pressureChart.setOption({ ...defaultOption, title: { text: '压力 (Pa)' } });
        shearStressChart.setOption({ ...defaultOption, title: { text: '壁面剪切应力 (Pa)' } });
        reynoldsChart.setOption({ ...defaultOption, title: { text: '雷诺数' } });

        // 窗口大小调整时重绘图表
        window.addEventListener('resize', function () {
            velocityChart.resize();
            pressureChart.resize();
            shearStressChart.resize();
            reynoldsChart.resize();
        });

        return {
            velocityChart: velocityChart,
            pressureChart: pressureChart,
            shearStressChart: shearStressChart,
            reynoldsChart: reynoldsChart
        };
    }

    // 获取所有患者
    async function fetchPatients() {
        try {
            const response = await fetch(`${API_BASE_URL}/patients`);
            if (!response.ok) throw new Error('获取患者列表失败');
            const patients = await response.json();
            return patients;
        } catch (error) {
            console.error('获取患者失败:', error);
            alert('获取患者列表失败: ' + error.message);
            return [];
        }
    }

    // 渲染患者列表
    window.renderPatientList = async function () {
        console.log('renderPatientList函数已执行 - 开始获取患者数据');
        try {
            const patients = await fetchPatients();
            console.log('获取到患者数据:', patients);
            const patientSelect = document.getElementById('patient-select');

            if (!patientSelect) {
                console.error('未找到患者选择下拉框元素');
            } else {
                // 清空患者下拉框
                patientSelect.innerHTML = '<option value="">-- 请选择患者 --</option>';

                // 填充患者下拉框
                if (patients.length > 0) {
                    patients.forEach(patient => {
                        patientSelect.innerHTML += `<option value="${patient.id}">${patient.name} (ID: ${patient.id})</option>`;
                    });
                }
            }

            // 确保调用渲染表格函数
            console.log('准备调用renderPatientTable渲染表格');
            if (typeof window.renderPatientTable === 'function') {
                window.renderPatientTable(patients);
            } else {
                console.error('renderPatientTable函数未定义，无法渲染表格');
                // 创建错误提示
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger';
                errorDiv.textContent = '患者表格渲染失败: 渲染函数未定义';
                errorDiv.style.margin = '20px';
                document.body.prepend(errorDiv);
            }
        } catch (error) {
            console.error('renderPatientList执行失败:', error);
            alert('患者列表加载失败: ' + error.message);
        }
    };

    // 确保页面加载完成后调用患者列表渲染
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.renderPatientList);
        console.log('DOMContentLoaded事件已注册');
    } else {
        console.log('DOM已加载，立即调用renderPatientList');
        window.renderPatientList();
    }

    // 渲染患者表格 - 确保此函数被正确调用
    window.renderPatientTable = function (patients) {
        console.log('renderPatientTable函数被调用，当前时间戳:', new Date().getTime());
        console.log('患者数据:', patients);

        // 检查DOM是否已加载完成
        if (document.readyState !== 'complete') {
            console.warn('DOM尚未完全加载，推迟表格渲染');
            setTimeout(() => window.renderPatientTable(patients), 100);
            return;
        }

        // 修复表格ID选择器，匹配HTML中的patient-table-body
        const tableBody = document.getElementById('patient-table-body');

        // 添加详细的调试信息
        if (!tableBody) {
            console.error('未找到patient-table-body元素!');
            console.log('当前文档状态:', document.readyState);
            console.log('所有tbody元素:', document.getElementsByTagName('tbody'));
            console.log('所有表格元素:', document.getElementsByTagName('table'));

            // 尝试通过其他方式查找表格
            const tables = document.getElementsByTagName('table');
            if (tables.length > 0) {
                console.log('第一个表格的HTML:', tables[0].outerHTML);
            }

            // 创建临时提示元素
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = '患者表格加载失败: 未找到表格容器元素';
            errorDiv.style.margin = '20px';
            document.body.prepend(errorDiv);
            return;
        }

        console.log('找到patient-table-body元素，开始渲染表格内容');
        tableBody.innerHTML = '';

        if (!patients || patients.length === 0) {
            console.log('没有患者数据，显示空状态');
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">暂无患者数据</td>';
            tableBody.appendChild(row);
            return;
        }

        patients.forEach(patient => {
            // 验证患者数据结构
            // console.log('渲染患者数据:', patient);
            if (patient.age === undefined) {
                console.error('患者数据缺少age字段:', patient);
            }
            if (patient.gender === undefined) {
                console.error('患者数据缺少gender字段:', patient);
            }

            const row = document.createElement('tr');
            // 确保年龄和性别在独立的td元素中
            row.innerHTML = `
                <td>${patient.id || '未知ID'}</td>
                <td>${patient.name || '未知姓名'}</td>
                <td>${patient.gender !== undefined ? patient.gender : '未知性别'}</td>
                <td>${patient.age !== undefined ? patient.age : '未知年龄'}</td>
                <td>
                    <button class="btn btn-sm btn-primary view-files-btn" data-id="${patient.id}">View Files</button>
                    <button class="btn btn-sm btn-danger delete-patient-btn" data-id="${patient.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        console.log('患者表格渲染完成，共渲染', patients.length, '条患者数据');

        // 添加按钮事件监听器
        document.querySelectorAll('.view-files-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const patientId = e.target.getAttribute('data-id');
                loadPatientFiles(patientId);
            });
        });

        document.querySelectorAll('.delete-patient-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const patientId = e.target.getAttribute('data-id');
                if (confirm('确定要删除该患者吗?')) {
                    const success = await deletePatient(patientId);
                    if (success) {
                        renderPatientList();
                    }
                }
            });
        });
    };

    // 添加事件监听器
    document.querySelectorAll('.view-files-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const patientId = e.target.getAttribute('data-id');
            loadPatientFiles(patientId);
        });
    });


    // document.querySelectorAll('.delete-patient-btn').forEach(btn => {
    //     btn.addEventListener('click',(e) => {
    //         alert("点击了删除按钮")
    //     });
    // });

    // 删除重复的事件监听器定义


    // 页面加载完成后初始化患者列表
    // console.log('准备注册DOMContentLoaded事件监听器');

    // 直接调用一次用于测试
    console.log('直接调用renderPatientList进行测试');
    window.renderPatientList().catch(error => {
        console.error('renderPatientList直接调用失败:', error);
    });

    // 注册DOMContentLoaded事件
    // document.addEventListener('DOMContentLoaded', () => {
    //     console.log('DOMContentLoaded事件触发，初始化页面组件');

    // 添加患者表单事件监听
    const addPatientForm = document.getElementById('add-patient-form');
    if (addPatientForm) {
        addPatientForm.addEventListener('submit', handleFormSubmit);
        console.log('添加患者表单事件监听器已注册');
    } else {
        console.error('未找到添加患者表单，请检查表单ID是否为"add-patient-form"');
    }

    // STL上传表单事件监听
    const stlUploadForm = document.getElementById('stl-upload-form');
    if (stlUploadForm) {
        stlUploadForm.addEventListener('submit', handleSTLUploadSubmit);
        console.log('STL上传表单事件监听器已注册');
    } else {
        console.error('未找到STL上传表单，请检查表单ID是否为"stl-upload-form"');
    }

    // 安全调用初始化函数
    try {
        if (window.renderPatientList) {
            window.renderPatientList();
        }
    } catch (error) {
        console.error('初始化失败:', error);
    }
    // });

    // 添加窗口加载事件作为备选
    window.addEventListener('load', () => {
        console.log('window.load事件触发，调用renderPatientList');
        try {
            window.renderPatientList();
        } catch (error) {
            console.error('window.load事件中调用renderPatientList失败:', error);
        }
    });

    // 删除患者
    async function deletePatient(patientId) {
        try {
            const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('删除患者失败');
            return true;
        } catch (error) {
            console.error('删除患者失败:', error);
            alert('删除患者失败: ' + error.message);
            return false;
        }
    }

    // 加载患者文件
    async function loadPatientFiles(patientId) {
        if (!patientId) {
            console.error('缺少patientId参数');
            return;
        }
        console.log('加载患者文件列表, patientId:', patientId);
        try {
            // 使用全局API_BASE_URL
            const response = await fetch(`${window.API_BASE_URL}/files/patient/${patientId}`);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            const files = await response.json();
            console.log('成功加载患者文件:', files);
            renderFileList(files);
        } catch (error) {
            console.error('加载患者文件失败:', error);
            alert('加载患者文件失败: ' + error.message);
        }
    }

    // 处理STL文件（转换为点云并运行预测）
    async function processSTLFile(fileId) {
        currentFileId = fileId;
        const processStatus = document.getElementById('process-status');
        processStatus.textContent = '处理中...';

        try {
            const response = await fetch(`${API_BASE_URL}/files/process/${fileId}`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('文件处理失败');

            const result = await response.json();
            processStatus.textContent = '处理完成';

            // 更新图表数据
            updateCharts(result.parameters);

            // 显示预测结果
            const predictionResult = document.getElementById('prediction-result');
            predictionResult.innerHTML = `
                <div class="alert alert-success">
                    <h5>预测结果</h5>
                    <p>最大流速: ${result.parameters.velocity.max.toFixed(4)} m/s</p>
                    <p>最大压力: ${result.parameters.pressure.max.toFixed(4)} Pa</p>
                    <p>最大壁面剪切应力: ${result.parameters.shearStress.max.toFixed(4)} Pa</p>
                    <p>雷诺数: ${result.parameters.reynoldsNumber.toFixed(2)}</p>
                </div>
            `;
        } catch (error) {
            console.error('文件处理失败:', error);
            processStatus.textContent = '处理失败';
            alert('文件处理失败: ' + error.message);
        }
    }

    // 渲染文件列表
    function renderFileList(files) {
        const stlViewer = document.getElementById('stlViewer');
        const emptyMessage = stlViewer.querySelector('.empty-model-message');

        if (!files || files.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'flex';
        } else {
            if (emptyMessage) emptyMessage.style.display = 'none';
        }
        console.log('开始渲染文件列表:', files);
        const fileListContainer = document.getElementById('uploaded-files-list');

        if (!fileListContainer) {
            console.error('文件列表容器不存在');
            alert('无法显示文件列表: 容器元素缺失');
            return;
        }

        // 清空现有内容
        fileListContainer.innerHTML = '';

        if (!files || files.length === 0) {
            fileListContainer.innerHTML = '<div class="alert alert-info">该患者暂无文件</div>';
            return;
        }

        // 创建文件列表
        const fileList = document.createElement('ul');
        fileList.className = 'list-group';

        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            // 格式化日期
            const uploadDate = new Date(file.upload_time);
            const formattedDate = uploadDate.toLocaleString();

            // 文件信息
            const fileInfo = document.createElement('div');
            fileInfo.innerHTML = `
                <strong>${file.file_name}</strong><br>
                <small class="text-muted">上传时间: ${formattedDate}</small><br>
                <small class="text-muted">大小: ${formatFileSize(file.file_size)}</small>
            `;

            // 操作按钮组
            const buttonGroup = document.createElement('div');

            // 查看模型按钮
            const viewButton = document.createElement('button');
            viewButton.className = 'btn btn-sm btn-outline-primary me-2';
            viewButton.textContent = '查看模型';
            viewButton.addEventListener('click', () => {
                loadSTLModel(`${API_BASE_URL}/files/${file.id}/download`, file);
            });

            // 处理文件按钮
            const processButton = document.createElement('button');
            processButton.className = 'btn btn-sm btn-outline-success';
            processButton.textContent = file.processed ? '查看结果' : '处理文件';
            processButton.addEventListener('click', () => {
                processSTLFile(file.id);
            });

            buttonGroup.appendChild(viewButton);
            buttonGroup.appendChild(processButton);
            listItem.appendChild(fileInfo);
            listItem.appendChild(buttonGroup);
            fileList.appendChild(listItem);
        });

        fileListContainer.appendChild(fileList);
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === undefined || bytes === null) return '未知大小';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 更新图表数据
    function updateCharts(parameters) {
        const charts = window.appCharts || initCharts();
        window.appCharts = charts;

        charts.velocityChart.setOption({
            series: [{ data: parameters.velocity.values }]
        });

        charts.pressureChart.setOption({
            series: [{ data: parameters.pressure.values }]
        });

        charts.shearStressChart.setOption({
            series: [{ data: parameters.shearStress.values }]
        });

        charts.reynoldsChart.setOption({
            series: [{ data: [parameters.reynoldsNumber, 0, 0] }]
        });
    }

    // 设置添加患者表单事件监听
    function setupAddPatientForm() {
        console.log('开始设置添加患者表单');
        // 尝试多种可能的选择器
        const selectors = [
            '#add-patient-form', // 匹配HTML中实际的表单ID
            '#addPatientForm',
            '#patientForm',
            'form[name="addPatient"]',
            'form[name="patient"]',
            '.add-patient-form',
            'form[id$="PatientForm"]',
            'form'
        ];

        let addPatientForm = null;
        for (const selector of selectors) {
            addPatientForm = document.querySelector(selector);
            if (addPatientForm) {
                console.log(`找到添加患者表单，使用选择器: ${selector}`);
                break;
            }
        }

        if (addPatientForm) {
            console.log('找到添加患者表单，设置提交事件监听器');
            addPatientForm.removeEventListener('submit', handleFormSubmit);
            addPatientForm.addEventListener('submit', handleFormSubmit);
        } else {
            console.error('未找到添加患者表单，已尝试所有可能的选择器');
            const allForms = document.getElementsByTagName('form');
            console.log(`页面中共有 ${allForms.length} 个表单元素:`);
            Array.from(allForms).forEach((form, index) => {
                console.log(`表单 ${index + 1}: id="${form.id}", name="${form.name}", class="${form.className}"`);
            });
        }
    }

    // 添加患者表单提交处理
    // 设置STL文件上传表单事件监听
    function setupSTLUploadForm() {
        console.log('开始设置STL上传表单');
        const stlUploadForm = document.getElementById('stl-upload-form');

        if (stlUploadForm) {
            console.log('找到STL上传表单，设置提交事件监听器');
            stlUploadForm.removeEventListener('submit', handleSTLUploadSubmit);
            stlUploadForm.addEventListener('submit', handleSTLUploadSubmit);
        } else {
            console.error('未找到STL上传表单');
        }
    }

    // STL文件上传表单提交处理
    async function handleSTLUploadSubmit(e) {
        e.preventDefault();
        console.log('STL文件上传表单提交已阻止默认行为');

        const patientSelect = document.getElementById('patient-select');
        const stlFileInput = document.getElementById('stl-file');

        if (!patientSelect.value) {
            alert('请先选择患者');
            return;
        }

        if (!stlFileInput.files.length) {
            alert('请选择要上传的STL文件');
            return;
        }

        const formData = new FormData();
        formData.append('patientId', patientSelect.value);
        formData.append('stlFile', stlFileInput.files[0]);

        try {
            const response = await fetch(`${API_BASE_URL}/files/upload`, {
                method: 'POST',
                body: formData
                // 不需要手动设置Content-Type，FormData会自动设置multipart/form-data
            });

            if (!response.ok) {
                throw new Error(`文件上传失败: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('文件上传成功:', result);
            alert('STL文件上传成功!');

            // 重置表单
            e.target.reset();

            // 刷新患者文件列表
            loadPatientFiles(patientSelect.value);
        } catch (error) {
            console.error('STL文件上传失败:', error);
            alert('文件上传失败: ' + error.message);
        }
    }

    // 添加患者表单提交处理
    async function handleFormSubmit(e) {
        e.preventDefault();
        console.log('表单提交已阻止默认行为');
        try {
            // 获取所有表单输入字段
            const nameInput = document.getElementById('patient-name');
            const ageInput = document.getElementById('patient-age');
            const genderInput = document.getElementById('patient-gender');
            const heightInput = document.getElementById('patient-height');
            const weightInput = document.getElementById('patient-weight');
            const historyInput = document.getElementById('patient-history');

            // 检查必填字段
            if (!nameInput || !ageInput || !genderInput) {
                console.error('必填表单字段缺失');
                alert('姓名、年龄和性别为必填项');
                return;
            }

            // 处理年龄输入
            const ageValue = ageInput.value.trim();
            const age = isNaN(ageValue) ? null : parseInt(ageValue);
            if (age === null || age < 0) {
                console.error('年龄输入无效');
                alert('年龄必须是有效的正整数');
                return;
            }

            // 处理身高和体重（可选字段）
            const height = heightInput.value.trim() ? parseFloat(heightInput.value.trim()) : null;
            const weight = weightInput.value.trim() ? parseFloat(weightInput.value.trim()) : null;

            // 构建完整患者数据对象
            const patientData = {
                name: nameInput.value.trim(),
                age: age,
                gender: genderInput.value.trim(),
                height: height,
                weight: weight,
                medical_history: historyInput.value.trim()
            };

            console.log('提交患者数据:', patientData);

            // 发送POST请求
            const response = await fetch(`${API_BASE_URL}/patients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patientData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP错误! 状态码: ${response.status}`);
            }

            const newPatient = await response.json();
            console.log('患者添加成功:', newPatient);
            alert('患者添加成功!');

            // 重置表单
            e.target.reset();
            window.renderPatientList();
        } catch (error) {
            console.error('添加患者失败:', error);
            alert('添加患者失败: ' + error.message);
        }
        console.log('开始设置添加患者表单');
        // 尝试多种可能的选择器
        const selectors = [
            '#add-patient-form', // 匹配HTML中实际的表单ID
            '#addPatientForm',
            '#patientForm',
            'form[name="addPatient"]',
            'form[name="patient"]',
            '.add-patient-form',
            'form[id$="PatientForm"]',
            'form'
        ];

        let addPatientForm = null;
        for (const selector of selectors) {
            addPatientForm = document.querySelector(selector);
            if (addPatientForm) {
                console.log(`找到添加患者表单，使用选择器: ${selector}`);
                break;
            }
        }

        if (addPatientForm) {
            console.log('找到添加患者表单，设置提交事件监听器');
            addPatientForm.removeEventListener('submit', handleFormSubmit);
            addPatientForm.addEventListener('submit', handleFormSubmit);
        } else {
            console.error('未找到添加患者表单，已尝试所有可能的选择器');
            // 添加更详细的调试信息
            const allForms = document.getElementsByTagName('form');
            console.log(`页面中共有 ${allForms.length} 个表单元素:`);
            Array.from(allForms).forEach((form, index) => {
                console.log(`表单 ${index + 1}: id="${form.id}", name="${form.name}", class="${form.className}"`);
            });
        }
    }
});