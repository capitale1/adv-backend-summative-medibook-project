const IORedis = require('ioredis');
const { redis } = require('./index');

function createRedisClient(name) {
  const client = new IORedis({
    host: redis.host,
    port: redis.port,
    maxRetriesPerRequest: 1,
  });
  client.on('error', (err) => console.error(`Redis (${name}) error:`, err.message));
  return client;
}

function waitUntilReady(client) {
  if (client.status === 'ready') return Promise.resolve();
  return new Promise((resolve) => client.once('ready', resolve));
}

module.exports = { createRedisClient, waitUntilReady };
