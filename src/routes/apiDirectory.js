import express from 'express';
import unless from 'express-unless';
import join from 'url-join';

import authMiddleware, { login } from '../middleware/authMiddleware';
import adminRouter from './user';
import activityReportsRouter from './activityReports';

export const loginPath = '/login';

authMiddleware.unless = unless;

const router = express.Router();

router.use(authMiddleware.unless({ path: [join('/api', loginPath)] }));

router.use('/admin/user', adminRouter);
router.use('/activity-reports', activityReportsRouter);

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

// Server 404s need to be explicitly handled by express
router.get('*', (req, res) => {
  res.sendStatus(404);
});

export default router;
