const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute(
    'SELECT id, full_name, email, phone, created_at FROM patients ORDER BY id'
  );
  return rows;
}

async function findById(id, db = pool) {
  const [rows] = await db.execute(
    'SELECT id, full_name, email, phone, created_at FROM patients WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function create({ full_name, email, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [full_name, email, phone]
  );
  return findById(result.insertId);
}

async function update(id, { full_name, email, phone }) {
  const [result] = await pool.execute(
    'UPDATE patients SET full_name = ?, email = ?, phone = ? WHERE id = ?',
    [full_name, email, phone, id]
  );
  return result.affectedRows > 0 ? findById(id) : null;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
