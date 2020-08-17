import express from 'express';
import helmet from 'helmet';
import passport from 'passport';

import authMiddleware from './middleware/authMiddleware';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(passport.initialize());

app.use(authMiddleware);

app.get('/', (req, res) => {
  res.send('Hello from ttadp');
});

app.get('/oauth2-client/login/oauth2/code/',
  passport.authenticate('oauth2'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('frontend/build'));
}

const server = app.listen(process.env.PORT || 8080, () => {
  // TODO: add a logging message
});

module.exports = server;
