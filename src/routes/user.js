import express from 'express';
import getUsers, {
  getUser, createUser, updateUser, deleteUser,
} from './admin/user';
import userAdminAccessMiddleware from '../middleware/userAdminAccessMiddleware';

const router = express.Router();

/**
 * API for frontend to manage user updates.
 */

router.get('/:userId', userAdminAccessMiddleware, getUser);

router.get('/', userAdminAccessMiddleware, getUsers);

router.post('/', userAdminAccessMiddleware, createUser);

router.put('/:userId', userAdminAccessMiddleware, updateUser);

router.delete('/:userId', userAdminAccessMiddleware, deleteUser);

export default router;
