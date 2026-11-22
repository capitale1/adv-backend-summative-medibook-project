const pool = require('../config/db');

async function getDoctorSummary(doctorId) {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctor_id,
            d.full_name AS doctor_name,
            d.specialty,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected,
            COUNT(CASE WHEN a.status = 'BOOKED' AND a.slot_start > NOW() THEN 1 END) AS upcoming_appointments
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      WHERE d.id = ?
      GROUP BY d.id, d.full_name, d.specialty`,
    [doctorId]
  );
  return rows[0] || null;
}

async function getDailyAppointmentCounts(doctorId, windowDays, dailyCap) {
  const [rows] = await pool.execute(
    `WITH RECURSIVE window_days AS (
       SELECT CURDATE() AS day, 1 AS day_number
       UNION ALL
       SELECT day + INTERVAL 1 DAY, day_number + 1
         FROM window_days
        WHERE day_number < ?
     )
     SELECT DATE_FORMAT(w.day, '%Y-%m-%d') AS date,
            COUNT(a.id) AS appointments,
            ROUND(COUNT(a.id) / ? * 100, 1) AS utilization_percent
       FROM window_days w
       LEFT JOIN appointments a
              ON a.doctor_id = ?
             AND a.status = 'BOOKED'
             AND a.slot_start >= w.day
             AND a.slot_start < w.day + INTERVAL 1 DAY
      GROUP BY w.day
      ORDER BY w.day`,
    [windowDays, dailyCap, doctorId]
  );
  return rows;
}

async function getWindowUtilization(doctorId, windowDays, dailyCap) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS booked_slots,
            ? * ? AS capacity,
            ROUND(COUNT(*) / (? * ?) * 100, 1) AS utilization_percent
       FROM appointments
      WHERE doctor_id = ?
        AND status = 'BOOKED'
        AND slot_start >= CURDATE()
        AND slot_start < CURDATE() + INTERVAL ? DAY`,
    [windowDays, dailyCap, windowDays, dailyCap, doctorId, windowDays]
  );
  return rows[0];
}

async function getDoctorsReport() {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctor_id,
            d.full_name AS doctor_name,
            d.specialty,
            COUNT(a.id) AS total_appointments,
            COUNT(CASE WHEN a.status = 'BOOKED' THEN 1 END) AS booked_appointments,
            COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) AS cancelled_appointments,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.full_name, d.specialty
      ORDER BY revenue_collected DESC, d.id`
  );
  return rows;
}

async function getBusyDays(dailyCap, busyThreshold) {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctor_id,
            d.full_name AS doctor_name,
            DATE_FORMAT(a.slot_start, '%Y-%m-%d') AS day,
            COUNT(*) AS booked_slots,
            ROUND(COUNT(*) / ? * 100, 1) AS utilization_percent
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.status = 'BOOKED'
      GROUP BY d.id, d.full_name, day
     HAVING COUNT(*) > ? * ?
      ORDER BY day, d.id`,
    [dailyCap, dailyCap, busyThreshold]
  );
  return rows;
}

module.exports = {
  getDoctorSummary,
  getDailyAppointmentCounts,
  getWindowUtilization,
  getDoctorsReport,
  getBusyDays,
};
