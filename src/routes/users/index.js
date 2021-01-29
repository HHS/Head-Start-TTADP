import express from 'express';
import {
  getPossibleCollaborators,
} from './handlers';

const router = express.Router();

/**
 * API for users
 */
router.get('/collaborators', getPossibleCollaborators);

export default router;
