const { Worker } = require('bullmq');
const { redis } = require('./config');
const pool = require('./config/db');
const Waitlist = require('./models/waitlistModel');
const { QUEUE_NAME, JOBS, closeQueue } = require('./queues/appointmentQueue');
const { promoteNextPatient } = require('./services/waitlistService');
const { sendConfirmation } = require('./services/notificationService');
const { ensureLogDirectory } = require('./utils/auditLogger');

const handlers = {
  [JOBS.SEND_CONFIRMATION]: (job) => sendConfirmation(job.data.appointmentId),
  [JOBS.PROMOTE_WAITLIST]: (job) => promoteNextPatient(job.data),
};

async function processJob(job) {
  const handler = handlers[job.name];
  if (!handler) throw new Error(`Unknown job type: ${job.name}`);
  return handler(job);
}

async function start() {
  await ensureLogDirectory();
  console.log('Worker waiting for Redis...');
  await Waitlist.ready();

  const recovered = await Waitlist.recoverInFlight();
  if (recovered > 0) console.log(`Returned ${recovered} interrupted waitlist entr${recovered === 1 ? 'y' : 'ies'} to the front of their queues`);

  const worker = new Worker(QUEUE_NAME, processJob, {
    connection: { host: redis.host, port: redis.port, maxRetriesPerRequest: null },
  });

  worker.on('completed', (job, result) => console.log(`Job ${job.name} #${job.id} completed${result ? `: ${result}` : ''}`));
  worker.on('failed', (job, err) => console.error(`Job ${job?.name} #${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message));
  worker.on('error', (err) => console.error('Worker error:', err.message));

  async function shutdown() {
    console.log('Worker shutting down...');
    await worker.close();
    await closeQueue();
    await Waitlist.close();
    await pool.end();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`Worker listening on queue "${QUEUE_NAME}"`);
}

start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
