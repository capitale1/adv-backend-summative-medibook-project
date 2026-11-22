const { createRedisClient, waitUntilReady } = require('../config/redis');
const { ServiceUnavailableError } = require('../utils/errors');

const PROCESSING_KEY = 'waitlist:processing';
let client = null;

function getClient() {
  if (!client) client = createRedisClient('waitlist');
  return client;
}

async function run(command) {
  try {
    return await command(getClient());
  } catch (err) {
    console.error('Waitlist Redis command failed:', err.message);
    throw new ServiceUnavailableError('Waitlist service is temporarily unavailable, please try again later');
  }
}

function slotKey(doctorId, slotStart) {
  return `waitlist:doctor:${doctorId}:slot:${slotStart.replace(' ', 'T')}`;
}

function dayKey(doctorId, slotStart) {
  return `waitlist:doctor:${doctorId}:day:${slotStart.slice(0, 10)}`;
}

async function listEntries(key) {
  const raws = await run((redis) => redis.lrange(key, 0, -1));
  return raws.map((raw) => JSON.parse(raw));
}

async function add(key, { patientId, doctorId, slotStart }) {
  const entries = await listEntries(key);
  if (entries.some((entry) => entry.patient_id === patientId)) return null;

  const entry = JSON.stringify({
    key,
    patient_id: patientId,
    doctor_id: doctorId,
    slot_start: slotStart,
    joined_at: new Date().toISOString(),
  });
  return run((redis) => redis.rpush(key, entry));
}

function claimNext(key) {
  return run((redis) => redis.lmove(key, PROCESSING_KEY, 'LEFT', 'RIGHT'));
}

function complete(rawEntry) {
  return run((redis) => redis.lrem(PROCESSING_KEY, 1, rawEntry));
}

function release(rawEntry) {
  const { key } = JSON.parse(rawEntry);
  return run((redis) => redis.multi().lrem(PROCESSING_KEY, 1, rawEntry).lpush(key, rawEntry).exec());
}

async function recoverInFlight() {
  const inFlight = await run((redis) => redis.lrange(PROCESSING_KEY, 0, -1));
  for (const rawEntry of inFlight.reverse()) {
    await release(rawEntry);
  }
  return inFlight.length;
}

function ready() {
  return waitUntilReady(getClient());
}

async function close() {
  if (client) await client.quit();
}

module.exports = {
  slotKey,
  dayKey,
  listEntries,
  add,
  claimNext,
  complete,
  release,
  recoverInFlight,
  ready,
  close,
};
