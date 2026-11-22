const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute(
    'SELECT id, full_name, specialty, consultation_fee, room, created_at FROM doctors ORDER BY id'
  );
  return rows;
}

async function findById(id, db = pool) {
  const [rows] = await db.execute(
    'SELECT id, full_name, specialty, consultation_fee, room, created_at FROM doctors WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id, full_name, consultation_fee FROM doctors WHERE id = ? FOR UPDATE',
    [id]
  );
  return rows[0] || null;
}

async function create({ full_name, specialty, consultation_fee, room }) {
  const [result] = await pool.execute(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [full_name, specialty, consultation_fee, room]
  );
  return findById(result.insertId);
}

async function update(id, { full_name, specialty, consultation_fee, room }) {
  const [result] = await pool.execute(
    'UPDATE doctors SET full_name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE id = ?',
    [full_name, specialty, consultation_fee, room, id]
  );
  return result.affectedRows > 0 ? findById(id) : null;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByIdForUpdate, create, update, remove };
