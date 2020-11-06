import express from 'express';
import { login } from '../middleware/authMiddleware';
import adminRouter from './user';

export const loginPath = '/login';

const router = express.Router();

// router.use('/admin/user', require('./user').default);
router.use('/admin/user', adminRouter);

router.use('/hello', (req, res) => {
  res.send('Hello from ttadp');
});

router.get('/user', (req, res) => {
  const { userId, role, name } = req.session;
  res.send({ userId, role, name });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.sendStatus(204);
});

router.get(loginPath, login);

export default router;
