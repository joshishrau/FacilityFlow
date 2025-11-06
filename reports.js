const express = require('express');
const router = express.Router();
const pool = require('../db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { verifyToken } = require('../middleware/auth');

// Monthly usage report
router.get('/monthly', verifyToken, async (req, res) => {
  const { hall, month, year, department } = req.query;
  try {
    // Simple aggregation: sum total_duration for approved bookings
    let q = 'SELECT hall, SUM(total_duration) as total_hours FROM bookings WHERE status = "approved"';
    const params = [];
    if (hall) { q += ' AND hall = ?'; params.push(hall); }
    if (month && year) { q += ' AND MONTH(date)=? AND YEAR(date)=?'; params.push(month, year); }
    if (department) { q += ' AND department = ?'; params.push(department); }
    q += ' GROUP BY hall';
    const [rows] = await pool.query(q, params);
    res.json({ ok: true, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Export as Excel
router.get('/monthly/export/excel', verifyToken, async (req, res) => {
  const { hall, month, year, department } = req.query;
  try {
    let q = 'SELECT date, hall, department, event_name, total_duration, status FROM bookings WHERE status = "approved"';
    const params = [];
    if (hall) { q += ' AND hall = ?'; params.push(hall); }
    if (month && year) { q += ' AND MONTH(date)=? AND YEAR(date)=?'; params.push(month, year); }
    if (department) { q += ' AND department = ?'; params.push(department); }
    const [rows] = await pool.query(q, params);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report');
    ws.addRow(['Date','Hall','Department','Event','Duration','Status']);
    rows.forEach(r => ws.addRow([r.date, r.hall, r.department, r.event_name, r.total_duration, r.status]));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export error' });
  }
});

module.exports = router;
