import express from 'express';
import getUsers, {
  getUser, createUser, updateUser, deleteUser,
} from './admin/user';
import userAdminAccessMiddleware from '../middleware/userAdminAccessMiddleware';

const router = express.Router();

/**
 * API for frontend to manage user updates.
 */

router.use(userAdminAccessMiddleware);

router.get('/:userId', getUser);

router.get('/', getUsers);

router.post('/', createUser);

router.put('/:userId', updateUser);

router.delete('/:userId', deleteUser);

export default router;
