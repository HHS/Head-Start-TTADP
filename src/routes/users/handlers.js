/* eslint-disable import/prefer-default-export */
import UserPolicy from '../../policies/user';
import SCOPES from '../../middleware/scopeConstants';
import { userById, usersWithPermissions } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';
import { DECIMAL_BASE } from '../../constants';

export async function getPossibleCollaborators(req, res) {
  try {
    const user = await userById(req.session.userId);
    const { region } = req.query;
    const authorization = new UserPolicy(user);
    if (!authorization.canViewUsersInRegion(parseInt(region, DECIMAL_BASE))) {
      res.sendStatus(403);
      return;
    }

    const users = await usersWithPermissions([region], SCOPES.READ_WRITE_REPORTS);
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USER' });
  }
}
