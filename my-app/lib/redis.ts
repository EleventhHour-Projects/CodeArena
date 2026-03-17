// lib/redis.ts
import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
  var _redisClientPromise: Promise<RedisClientType> | undefined;
}

let redisClientPromise: Promise<RedisClientType>;

if (process.env.NODE_ENV === 'development') {
  if (!global._redisClientPromise) {
    const redisClient = createClient({ url: REDIS_URL }) as RedisClientType;
    global._redisClientPromise = redisClient.connect().then(() => {
      console.log('NextJS Redis client connected');
      return redisClient;
    }).catch((err) => {
      console.error('[ERROR] Couldn\'t connect to Redis client:', err);
      throw err;
    });
  }
  redisClientPromise = global._redisClientPromise;
} else {
  // In production, create a new client (serverless environments often manage connections)
  const redisClient = createClient({ url: REDIS_URL }) as RedisClientType;
  redisClientPromise = redisClient.connect();
}

export { redisClientPromise };
