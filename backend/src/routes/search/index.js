import express from 'express';
/*
import {
  searchIndex,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
*/
// TODO: If we expose this route we need to add authorization logic.
const router = express.Router();
// router.get('/', transactionWrapper(searchIndex));
export default router;
