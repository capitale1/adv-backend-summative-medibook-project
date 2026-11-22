const mysql = require('mysql2/promise');
const { db } = require('./index');

const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
});

module.exports = pool;
