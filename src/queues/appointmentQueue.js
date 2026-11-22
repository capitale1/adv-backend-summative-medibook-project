const { Queue } = require('bullmq');
const { redis } = require('../config');

const QUEUE_NAME = 'appointments';

const JOBS = Object.freeze({
  SEND_CONFIRMATION: 'send-confirmation',
  PROMOTE_WAITLIST: 'promote-waitlist',
});

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

let queue = null;

function getQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: { host: redis.host, port: redis.port, enableOfflineQueue: false },
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queue.on('error', (err) => console.error('Appointment queue error:', err.message));
  }
  return queue;
}

async function enqueue(name, data, options) {
  try {
    await getQueue().add(name, data, options);
  } catch (err) {
    console.error(`Could not enqueue ${name} job:`, err.message);
  }
}

function enqueueConfirmation(appointmentId) {
  return enqueue(JOBS.SEND_CONFIRMATION, { appointmentId }, { jobId: `confirmation-${appointmentId}` });
}

function enqueueWaitlistPromotion(doctorId, slotStart) {
  return enqueue(JOBS.PROMOTE_WAITLIST, { doctorId, slotStart });
}

async function closeQueue() {
  if (queue) await queue.close();
}

module.exports = { QUEUE_NAME, JOBS, enqueueConfirmation, enqueueWaitlistPromotion, closeQueue };
