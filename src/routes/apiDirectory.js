import express from 'express';

const router = express.Router();

router.use('/user', require('./user').default);

export default router;
