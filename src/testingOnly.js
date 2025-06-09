import express from 'express';

import {} from 'dotenv/config';
import { auditLogger } from './logger';
import testRouter from './routes/testingOnly';

const app = express();

app.use('/testingOnly', testRouter);

app.listen(9999, '0.0.0.0', () => {
  auditLogger.info('TestingOnly listening on port 9999');
});

export default app;
