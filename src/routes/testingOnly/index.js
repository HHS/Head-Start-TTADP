import express from 'express';
import { reseedDB, queryDB, health } from './handlers';

const testRouter = express.Router();
testRouter.use(express.json({ limit: '2MB' }));
// must run outside of transaction wrapper as some of the action will run in a child process
testRouter.get('/', health);
testRouter.get('/reseed', reseedDB);
testRouter.post('/query', queryDB);

/* eslint-disable import/prefer-default-export */
export { testRouter };
