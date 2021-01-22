/* eslint-disable import/prefer-default-export */
import Users from '../../policies/user';
import SCOPES from '../../middleware/scopeConstants';
import { userById, usersWithPermissions } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';

export async function getPossibleCollaborators(req, res) {
  try {
    const user = await userById(req.session.userId);
    const { region } = req.query;
    const authorization = new Users(user);
    if (!authorization.canViewUsersInRegion(parseInt(region, 10))) {
      res.sendStatus(403);
      return;
    }

    const users = await usersWithPermissions([region], SCOPES.READ_WRITE_REPORTS);
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USER' });
  }
}
