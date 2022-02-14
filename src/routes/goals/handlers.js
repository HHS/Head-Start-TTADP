import { updateGoalStatusById } from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
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
