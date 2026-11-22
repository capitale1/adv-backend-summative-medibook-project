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

async function countBookedForDoctorBetween(connection, doctorId, fromInclusive, toExclusive) {
  const [rows] = await connection.execute(
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

module.exports = { findById, findByIdForUpdate, countBookedForDoctorBetween, insert, markCancelled };
