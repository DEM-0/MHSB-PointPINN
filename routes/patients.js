const express = require('express');
const router = express.Router();
const { patientDB } = require('../db');

/**
 * @route   POST /api/patients
 * @desc    创建新患者
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const patient = req.body;
    if (!patient.name || !patient.gender || !patient.age) {
      return res.status(400).json({ message: '患者姓名、性别和年龄为必填项' });
    }
    const newPatient = await patientDB.create(patient);
    res.status(201).json(newPatient);
  } catch (error) {
    console.error('创建患者失败:', error);
    res.status(500).json({ message: '服务器错误，创建患者失败' });
  }
});

/**
 * @route   GET /api/patients
 * @desc    获取所有患者
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const patients = await patientDB.getAll();
    res.json(patients);
  } catch (error) {
    console.error('获取患者列表失败:', error);
    res.status(500).json({ message: '服务器错误，获取患者列表失败' });
  }
});

/**
 * @route   GET /api/patients/:id
 * @desc    根据ID获取患者
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: '无效的患者ID' });
    }
    const patient = await patientDB.getById(id);
    if (!patient) {
      return res.status(404).json({ message: '未找到该患者' });
    }
    res.json(patient);
  } catch (error) {
    console.error('获取患者信息失败:', error);
    res.status(500).json({ message: '服务器错误，获取患者信息失败' });
  }
});

/**
 * @route   PUT /api/patients/:id
 * @desc    更新患者信息
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: '无效的患者ID' });
    }
    const patientData = req.body;
    const result = await patientDB.update(id, patientData);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '未找到该患者' });
    }
    res.json({ message: '患者信息更新成功' });
  } catch (error) {
    console.error('更新患者信息失败:', error);
    res.status(500).json({ message: '服务器错误，更新患者信息失败' });
  }
});

/**
 * @route   DELETE /api/patients/:id
 * @desc    删除患者
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: '无效的患者ID' });
    }
    const result = await patientDB.delete(id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '未找到该患者' });
    }
    res.json({ message: '患者删除成功' });
  } catch (error) {
    console.error('删除患者失败:', error);
    res.status(500).json({ message: '服务器错误，删除患者失败' });
  }
});

module.exports = router;