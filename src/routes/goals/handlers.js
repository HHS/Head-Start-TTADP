import { updateGoalStatusById } from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';
import Goal from '../../policies/goal';
import { userById } from '../../services/users';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
export async function changeGoalStatus(req, res) {
  try {
    const { goalId } = req.params;
    const {
      newStatus, closeSuspendReason, closeSuspendContext, regionId, oldStatus,
    } = req.body;

    const user = await userById(req.session.userId);

    if (!new Goal(user, { regionId }).canEdit()) {
      res.sendStatus(401);
      return;
    }

    const updatedGoal = await updateGoalStatusById(
      goalId,
      oldStatus,
      newStatus,
      closeSuspendReason,
      closeSuspendContext,
    );

    if (!updatedGoal) {
      res.sendStatus(404);
      return;
    }

    res.json(updatedGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
