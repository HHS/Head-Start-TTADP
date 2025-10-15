import session from 'express-session';
import connectRedis from 'connect-redis';
import { getRedis } from '../lib/redisClient';

const RedisStore = connectRedis(session);
const EIGHT_HOURS = 1000 * 60 * 60 * 8;

export default session({
  store: new RedisStore({
    client: getRedis(),
    prefix: 'sess:',
    disableTouch: false, // true => TTL doesn’t refresh on each hit
    ttl: Math.floor(EIGHT_HOURS / 1000),
  }),
  name: 'session',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // refresh cookie expiry on activity
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: EIGHT_HOURS,
  },
});
