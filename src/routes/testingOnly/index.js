import express from 'express';
import reseedDB from './handlers';
// import transactionWrapper from '../transactionWrapper';
import testingOnly from '../../middleware/testingOnlyMiddleware';

const router = express.Router();
// must run outside of transaction wrapper as some of the action will run in a child process
router.get('/reseed',testingOnly, reseedDB);

export default router;
