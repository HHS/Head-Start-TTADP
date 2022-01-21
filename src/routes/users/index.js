import express from 'express';
import {
  getPossibleCollaborators, getPossibleStateCodes,
} from './handlers';

const router = express.Router();

/**
 * API for users
 */
router.get('/collaborators', getPossibleCollaborators);
router.get('/stateCodes', getPossibleStateCodes);

export default router;
