const pool = require('../db');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

let transporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function createNotificationForUid(uid, message) {
  await pool.query('INSERT INTO notifications (uid,message,created_at) VALUES (?,?,NOW())', [uid, message]);
  // send email if transporter and user's email available
  if (transporter) {
    try {
      const [rows] = await pool.query('SELECT email FROM users WHERE uid = ? LIMIT 1', [uid]);
      const email = rows[0] ? rows[0].email : null;
      if (email) {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject: 'FacilityFlow notification', text: message });
      }
    } catch (err) {
      console.error('Failed to send notification email', err);
    }
  }
}

// helper to insert notifications for role (e.g., all HODs or Hall Managers)
async function createNotificationForRole(role, message) {
  // Match roles case-insensitively and allow common variations (e.g., 'HOD', 'hod', 'Head of Department')
  const wanted = (role || '').toString().toLowerCase();
  let qs = 'SELECT uid FROM users WHERE LOWER(role) = ?';
  let params = [wanted];
  if (wanted.includes('hod') || wanted.includes('head')) {
    qs = 'SELECT uid FROM users WHERE LOWER(role) LIKE ?';
    params = ['%hod%'];
  } else if (wanted.includes('hall') && wanted.includes('manager')) {
    qs = 'SELECT uid FROM users WHERE LOWER(role) LIKE ?';
    params = ['%hall%manager%'];
  } else if (wanted.includes('admin')) {
    qs = 'SELECT uid FROM users WHERE LOWER(role) LIKE ?';
    params = ['%admin%'];
  }
  const [rows] = await pool.query(qs, params);
  for (const r of rows) {
    try {
      await createNotificationForUid(r.uid, message);
    } catch (err) {
      console.error('Failed to create notification for', r.uid, err.message);
    }
  }
}

module.exports = { createNotificationForUid, createNotificationForRole };

// Optional: verify transporter connectivity (returns true/false)
module.exports.verifyTransporter = async function verifyTransporter() {
  if (!transporter) return false;
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    console.error('SMTP verification failed', err);
    return false;
  }
}
