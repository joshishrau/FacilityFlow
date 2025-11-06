const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const multer = require('multer');

const { verifyToken } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Public endpoint: list approved bookings consolidated with start/end times
router.get('/public/approved', async (req, res) => {
  try {
    // Fetch approved bookings and their slots
    const [bookings] = await pool.query('SELECT id, date, hall, department, event_name, purpose FROM bookings WHERE status = "approved" ORDER BY date DESC');
    if (bookings.length === 0) return res.json({ ok: true, data: [] });
    const ids = bookings.map(b => b.id);
    const [slots] = await pool.query('SELECT booking_id, slot_time FROM booking_slots WHERE booking_id IN (?)', [ids]);
    const map = new Map();
    for (const s of slots) {
      if (!map.has(s.booking_id)) map.set(s.booking_id, []);
      map.get(s.booking_id).push(s.slot_time);
    }
    const result = bookings.map(b => {
      const slotTimes = (map.get(b.id) || []).slice();
      // parse times like "09:00-10:00" -> start "09:00", end "10:00"
      let minStart = null; let maxEnd = null;
      for (const st of slotTimes) {
        const [start, end] = (st || '').split('-');
        if (start) minStart = !minStart || start < minStart ? start : minStart;
        if (end) maxEnd = !maxEnd || end > maxEnd ? end : maxEnd;
      }
      return {
        id: b.id,
        date: b.date,
        hall: b.hall,
        department: b.department,
        event_name: b.event_name,
        purpose: b.purpose,
        start_time: minStart,
        end_time: maxEnd
      };
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Create booking request (Club Head / Faculty)
router.post('/', verifyToken, upload.single('supporting_doc'), async (req, res) => {
  /* Expected body:
    { uid, name, department, event_name, purpose, date, slots: ['09:00-10:00', ...], hall, equipment, notes }
  */
  const { uid: bodyUid, name, department, event_name, purpose, date, slots, hall, equipment, notes, total_duration } = req.body;
  const uid = req.user && req.user.uid || bodyUid;
  const supporting_doc = req.file ? `/uploads/${req.file.filename}` : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
  // Determine initial status and notify next approver based on requester's role
  // Default: if requester is HOD -> pending_hall; if Hall Manager -> approved; otherwise pending_hod
  let initialStatus = 'pending_hod';
  // look up user role (normalize to lowercase for robust comparisons)
  const [userRows] = await connection.query('SELECT role FROM users WHERE uid = ? LIMIT 1', [uid]);
  const userRoleRaw = userRows[0] ? userRows[0].role : '';
  const userRole = (userRoleRaw || '').toString().toLowerCase();
  // Normalize common variations
  if (userRole === 'hod' || userRole === 'head of department' || userRole === 'head' || userRole==='HOD') initialStatus = 'pending_hall';
  if (userRole === 'hall manager' || userRole === 'hall_manager' || userRole === 'hall-manager') initialStatus = 'approved';
  const [resInsert] = await connection.query('INSERT INTO bookings (uid,name,department,event_name,purpose,date,hall,notes,total_duration,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())', [uid, name, department, event_name, purpose, date, hall, notes, total_duration, initialStatus]);
    const bookingId = resInsert.insertId;
    // Insert slots
    const slotsArr = typeof slots === 'string' ? JSON.parse(slots) : slots || [];
    for (const slot of slotsArr) {
      await connection.query('INSERT INTO booking_slots (booking_id,slot_time) VALUES (?,?)', [bookingId, slot]);
    }
    if (supporting_doc) {
      await connection.query('UPDATE bookings SET supporting_doc_path=? WHERE id=?', [supporting_doc, bookingId]);
    }
    // Create notification for the next approver
    const { createNotificationForRole, createNotificationForUid } = require('../utils/notifications');
    if (initialStatus === 'pending_hod') {
      await createNotificationForRole('HOD', `New booking #${bookingId} awaiting HOD approval`);
    } else if (initialStatus === 'pending_hall') {
      await createNotificationForRole('Hall Manager', `Booking #${bookingId} awaiting Hall Manager approval`);
    } else if (initialStatus === 'approved') {
      await createNotificationForUid(uid, `Your booking #${bookingId} has been auto-approved by Hall Manager`);
    }

    await connection.commit();
    res.json({ ok: true, bookingId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not create booking' });
  } finally {
    connection.release();
  }
});

// Get bookings (filter by role/query)
router.get('/', verifyToken, async (req, res) => {
  // Return bookings relevant to the authenticated user based on their role
  const uid = req.user && req.user.uid;
  try {
    // Get user role and department/hall responsibilities (normalize role)
    const [urows] = await pool.query('SELECT role, department, hall_responsibility FROM users WHERE uid = ? LIMIT 1', [uid]);
    const userRow = urows[0] || {};
    const role = (userRow.role || '').toString().toLowerCase();
    // Admin combined view
    if (req.query.as === 'admin' && (role === 'admin' || role === 'superadmin' || role === 'super-admin')) {
      const [pendingHod] = await pool.query('SELECT b.* FROM bookings b WHERE b.status = "pending_hod" ORDER BY b.date DESC');
      const [pendingHall] = await pool.query('SELECT b.* FROM bookings b WHERE b.status = "pending_hall" ORDER BY b.date DESC');
      return res.json({ ok: true, data: { pendingHod, pendingHall } });
    }
    if (role === 'hod' || role === 'head of department' || role === 'head') {
      // HOD sees bookings pending_hod for their department (case-insensitive match)
      const dept = (userRow.department || '').toString().trim();
      if (!dept) return res.json({ ok: true, data: [] });
      const [rows] = await pool.query('SELECT b.* FROM bookings b WHERE b.status = "pending_hod" AND LOWER(TRIM(b.department)) = LOWER(?) ORDER BY b.date DESC', [dept]);
      return res.json({ ok: true, data: rows });
    }
    if (role === 'hall manager' || role === 'hall_manager' || role === 'hall-manager') {
      // Hall Manager sees bookings pending_hall for halls they manage
      // hall_responsibility may be a comma-separated list
      const halls = (userRow.hall_responsibility || '').split(',').map(s => s.trim()).filter(Boolean);
      if (halls.length) {
        // case-insensitive match for halls
        const placeholders = halls.map(()=> 'LOWER(?)').join(',');
        const sql = `SELECT b.* FROM bookings b WHERE b.status = "pending_hall" AND LOWER(TRIM(b.hall)) IN (${placeholders}) ORDER BY b.date DESC`;
        const params = halls.map(h => h.toString().trim().toLowerCase());
        const [rows] = await pool.query(sql, params);
        return res.json({ ok: true, data: rows });
      }
      return res.json({ ok: true, data: [] });
    }
    // Default: normal user sees their own bookings
    const [rows] = await pool.query('SELECT b.* FROM bookings b WHERE b.uid = ? ORDER BY b.date DESC', [uid]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Approve by HOD -> sets status to 'pending_hall' and attach hod signature
router.put('/:id/approve/hod', verifyToken, async (req, res) => {
  const bookingId = req.params.id;
  try {
    // find HOD signature (assuming one HOD per department)
    const [hod] = await pool.query('SELECT signature_path FROM users WHERE role = "HOD" LIMIT 1');
    const signature = hod[0] ? hod[0].signature_path : null;
    await pool.query('UPDATE bookings SET status = "pending_hall", hod_signature_path = ? WHERE id = ?', [signature, bookingId]);
  const { createNotificationForRole } = require('../utils/notifications');
  // Notify Hall Managers
  await createNotificationForRole('Hall Manager', `Booking #${bookingId} forwarded by HOD awaiting Hall Manager approval`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Approve by Hall Manager -> final approval and lock slots
router.put('/:id/approve/hall', verifyToken, async (req, res) => {
  const bookingId = req.params.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // get booking slots
    const [slots] = await connection.query('SELECT slot_time FROM booking_slots WHERE booking_id = ?', [bookingId]);
    const [bookingRows] = await connection.query('SELECT date, hall FROM bookings WHERE id = ?', [bookingId]);
    if (!bookingRows.length) throw new Error('Booking not found');
    const bookingDate = bookingRows[0].date;
    const hall = bookingRows[0].hall;
    // Check for conflicts with already approved bookings
    const [conflicts] = await connection.query('SELECT b.id FROM bookings b JOIN booking_slots bs ON b.id = bs.booking_id WHERE b.status = "approved" AND b.hall = ? AND b.date = ? AND bs.slot_time IN (?)', [hall, bookingDate, slots.map(s => s.slot_time)]);
    if (conflicts.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Time slots conflict with approved bookings' });
    }
    // mark booking approved
    await connection.query('UPDATE bookings SET status = "approved", approved_at = NOW() WHERE id = ?', [bookingId]);
    // Notify booking owner
    const [ownerRows] = await connection.query('SELECT uid FROM bookings WHERE id = ? LIMIT 1', [bookingId]);
    if (ownerRows[0]) {
      const { createNotificationForUid } = require('../utils/notifications');
      await createNotificationForUid(ownerRows[0].uid, `Your booking #${bookingId} has been approved by Hall Manager`);
    }
    await connection.commit();
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'DB error' });
  } finally {
    connection.release();
  }
});

module.exports = router;

