const pool = require('../config/db');

async function findById(id, db = pool) {
  const [rows] = await db.execute(
    `SELECT id, patient_id, doctor_id, slot_start, amount_paid, status,
            booked_at, cancelled_at, refund_amount
       FROM appointments
      WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findDetailsById(id) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.slot_start, a.status, a.amount_paid,
            p.id AS patient_id, p.full_name AS patient_name, p.email AS patient_email, p.phone AS patient_phone,
            d.id AS doctor_id, d.full_name AS doctor_name, d.specialty, d.room
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT id, patient_id, doctor_id, slot_start, amount_paid, status
       FROM appointments
      WHERE id = ?
        FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function countBookedForDoctorBetween(doctorId, fromInclusive, toExclusive, db = pool) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS booked
       FROM appointments
      WHERE doctor_id = ?
        AND status = 'BOOKED'
        AND slot_start >= ?
        AND slot_start < ?`,
    [doctorId, fromInclusive, toExclusive]
  );
  return rows[0].booked;
}

async function isSlotBooked(doctorId, slotStart, db = pool) {
  const [rows] = await db.execute(
    `SELECT EXISTS (
       SELECT 1 FROM appointments
        WHERE doctor_id = ? AND slot_start = ? AND status = 'BOOKED'
     ) AS booked`,
    [doctorId, slotStart]
  );
  return rows[0].booked === 1;
}

async function insert(connection, { patientId, doctorId, slotStart, amountPaid }) {
  const [result] = await connection.execute(
    'INSERT INTO appointments (patient_id, doctor_id, slot_start, amount_paid) VALUES (?, ?, ?, ?)',
    [patientId, doctorId, slotStart, amountPaid]
  );
  return result.insertId;
}

async function markCancelled(connection, id, cancelledAt, refundAmount) {
  await connection.execute(
    `UPDATE appointments
        SET status = 'CANCELLED', cancelled_at = ?, refund_amount = ?
      WHERE id = ?`,
    [cancelledAt, refundAmount, id]
  );
}

module.exports = {
  findById,
  findDetailsById,
  findByIdForUpdate,
  countBookedForDoctorBetween,
  isSlotBooked,
  insert,
  markCancelled,
};
