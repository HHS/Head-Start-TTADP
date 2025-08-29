import session from 'express-session';

// NOTE: Using MemoryStore here but not recommended for production.
export default session({
  name: 'session',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // refresh cookie expiry on activity
  cookie: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    secureProxy: (process.env.NODE_ENV === 'production'),
  },
});
