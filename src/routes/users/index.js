import express from 'express';
import {
  getPossibleCollaborators, getPossibleStateCodes,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for users
 */
router.get('/collaborators', transactionWrapper(getPossibleCollaborators));
router.get('/stateCodes', transactionWrapper(getPossibleStateCodes));

export default router;
