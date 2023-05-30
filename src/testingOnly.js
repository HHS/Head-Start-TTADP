import express from 'express';
import {} from 'dotenv/config';
import testingRouter from './routes/testingOnly';

const app = express();

app.use('/testingOnly', testingRouter);

app.listen(9999, 'localhost', () => {});
