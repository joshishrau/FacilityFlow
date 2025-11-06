const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Sync user record after client registers via Firebase
router.post('/sync-user', verifyToken, upload.single('signature'), async (req, res) => {
  // Expected: { uid, name, email, role?, department?, hall_responsibility? }
  const tokenUid = req.user && req.user.uid;
  let { uid, name, email, role, department, hall_responsibility } = req.body;
  // Normalize role to lowercase to match DB queries
  role = role ? role.toLowerCase() : 'club head';

  uid = tokenUid || uid;
  const signaturePath = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE uid = ?', [uid]);
    if (rows.length) {
      // Conditional update: only update provided fields to avoid overwriting role on login
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(name); }
      if (email) { updates.push('email = ?'); params.push(email); }
      if (role) { updates.push('role = ?'); params.push(role); }
      if (department) { updates.push('department = ?'); params.push(department); }
      if (hall_responsibility) { updates.push('hall_responsibility = ?'); params.push(hall_responsibility); }
      if (signaturePath) { updates.push('signature_path = ?'); params.push(signaturePath); }
      if (updates.length) {
        params.push(uid);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`, params);
      }
      return res.json({ ok: true, message: 'User updated' });
    }
    await pool.query('INSERT INTO users (uid,name,email,role,department,hall_responsibility,signature_path,created_at) VALUES (?,?,?,?,?,?,?,NOW())', [uid, name, email, role, department, hall_responsibility, signaturePath]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    const resp = { error: 'DB error' };
    if (process.env.NODE_ENV !== 'production') resp.detail = err.message || String(err);
    res.status(500).json(resp);
  }
});

// Get current user's profile
router.get('/profile', verifyToken, async (req, res) => {
  const uid = req.user && req.user.uid;
  try {
    const [rows] = await pool.query('SELECT uid,name,email,role,department,hall_responsibility,signature_path FROM users WHERE uid = ? LIMIT 1', [uid]);
    res.json({ ok: true, data: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Update current user's profile (optionally upload signature)
router.put('/profile', verifyToken, upload.single('signature'), async (req, res) => {
  const uid = req.user && req.user.uid;
  const { name, department, hall_responsibility } = req.body;
  const signaturePath = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (department) { updates.push('department = ?'); params.push(department); }
    if (hall_responsibility) { updates.push('hall_responsibility = ?'); params.push(hall_responsibility); }
    if (signaturePath) { updates.push('signature_path = ?'); params.push(signaturePath); }
    if (updates.length) {
      params.push(uid);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`, params);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
