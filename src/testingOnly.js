import express from 'express';
import { auditLogger } from './logger';
import { testRouter } from './routes/testingOnly/index';

const app = express();

app.use('/testingOnly', testRouter);

app.listen(9999, '0.0.0.0', () => {
  auditLogger.info('TestingOnly listening on port 9999');
});

/* eslint-disable import/prefer-default-export */
export { app };
