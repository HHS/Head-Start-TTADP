import { updateGoalStatusById, createOrUpdateGoal } from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';
import Goal from '../../policies/goals';
import { userById } from '../../services/users';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

export async function createGoal(req, res) {
  try {
    const {
      id,
      grants,
      name,
      status,
      endDate,
      regionId,
      recipientId,
    } = req.body;

    const goalData = {
      id,
      grants,
      name,
      status,
      endDate,
      regionId,
      recipientId,
    };

    // check permissions
    const user = await userById(req.session.userId);
    const policy = new Goal(user, goalData);

    if (!policy.canCreate()) {
      res.sendStatus(401);
    }

    const newGoal = await createOrUpdateGoal(goalData);

    res.json(newGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function changeGoalStatus(req, res) {
  try {
    const { goalId } = req.params;
    const { newStatus } = req.body;
    // TODO: Who has permission to perform this operation.
    const updatedGoal = await updateGoalStatusById(goalId, newStatus);

    if (!updatedGoal) {
      res.sendStatus(404);
      return;
    }

    res.json(updatedGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
