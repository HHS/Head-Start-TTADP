import cookieSession from 'cookie-session';

export default cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET],

  // Cookie Options. httpOnly is set by default to true for https
  sameSite: 'lax',
  secureProxy: (process.env.NODE_ENV === 'production'),
});
