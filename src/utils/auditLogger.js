const fs = require('fs/promises');
const path = require('path');
const { auditLogFile } = require('../config');

const LOG_PATH = path.resolve(auditLogFile);
let logDirReady = null;

function ensureLogDirectory() {
  if (!logDirReady) {
    logDirReady = fs.mkdir(path.dirname(LOG_PATH), { recursive: true }).catch((err) => {
      logDirReady = null;
      throw err;
    });
  }
  return logDirReady;
}

async function writeAuditEntry(event, data) {
  try {
    await ensureLogDirectory();
    const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...data });
    await fs.appendFile(LOG_PATH, `${line}\n`, 'utf8');
  } catch (err) {
    console.error(`Audit log write failed (${event}):`, err.message);
  }
}

module.exports = { writeAuditEntry, ensureLogDirectory };
