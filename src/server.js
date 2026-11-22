const app = require('./app');
const { port } = require('./config');
const { ensureLogDirectory } = require('./utils/auditLogger');

async function start() {
  try {
    await ensureLogDirectory();
  } catch (err) {
    console.error('Could not create the audit log directory:', err.message);
  }
  app.listen(port, () => {
    console.log(`MediBook API listening on http://localhost:${port}`);
  });
}

start();
