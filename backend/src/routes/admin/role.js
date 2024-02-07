import express from 'express';
import {
  Role, sequelize,
} from '../../models';

import handleErrors from '../../lib/apiErrorHandler';
import transactionWrapper from '../transactionWrapper';

const namespace = 'SERVICE:USER';

const logContext = {
  namespace,
};

/**
 * Gets all roles from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getRoles(req, res) {
  try {
    const roles = await Role.findAll({
      order: [
        [sequelize.col('name'), 'ASC'],
      ],
    });
    res.json(roles);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function saveRoles(req, res) {
  try {
    const { roles } = req.body;
    await Role.bulkCreate(roles, { updateOnDuplicate: ['name', 'fullName'] });

    const updatedRoles = await Role.findAll({
      order: [
        [sequelize.col('name'), 'ASC'],
      ],
    });
    res.json(updatedRoles);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

const router = express.Router();

router.get('/', transactionWrapper(getRoles));
router.put('/', transactionWrapper(saveRoles));

export default router;
