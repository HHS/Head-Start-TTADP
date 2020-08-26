import express from 'express';
import logger, { requestLogger } from './logger';

const app = express();
app.use(requestLogger);

app.get('/', (req, res) => {
  logger.info('Hello from ttadp');
  res.send('Hello from ttadp');
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('src/frontend/build'));
}

module.exports = app;
