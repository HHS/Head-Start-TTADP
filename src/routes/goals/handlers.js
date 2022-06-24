import {
  updateGoalStatusById,
  createOrUpdateGoalsForActivityReport,
  createOrUpdateGoals,
  destroyGoal,
  goalById,
  goalByIdWithActivityReportsAndRegions,
  goalByIdAndRecipient,
} from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';
import Goal from '../../policies/goals';
import { userById } from '../../services/users';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

export async function createGoal(req, res) {
  try {
    const { goal, activityReportId } = req.body;

    const user = await userById(req.session.userId);

    const canCreate = new Goal(user, null, goal.regionId).canCreate();

    if (!canCreate) {
      res.sendStatus(401);
      return;
    }

    const newGoal = await createOrUpdateGoalsForActivityReport(goal, activityReportId);
    res.json(newGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function createGoals(req, res) {
  try {
    const { goals } = req.body;

    const user = await userById(req.session.userId);

    let canCreate = true;

    goals.forEach((goal) => {
      if (canCreate && !new Goal(user, null, goal.regionId).canCreate()) {
        canCreate = false;
      }
    });

    if (!canCreate) {
      res.sendStatus(401);
      return;
    }

    const newGoals = await createOrUpdateGoals(goals);

    res.json(newGoals);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function changeGoalStatus(req, res) {
  try {
    const { goalId } = req.params;
    const {
      newStatus, closeSuspendReason, closeSuspendContext, oldStatus,
    } = req.body;

    const user = await userById(req.session.userId);
    const goal = await goalByIdWithActivityReportsAndRegions(goalId);

    if (!goal) {
      res.sendStatus(404);
      return;
    }

    if (!new Goal(user, goal).canChangeStatus()) {
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

    res.json(updatedGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function deleteGoal(req, res) {
  try {
    const { goalId } = req.params;

    const user = await userById(req.session.userId);
    const goal = await goalByIdWithActivityReportsAndRegions(goalId);

    const policy = new Goal(user, goal);

    const canDelete = policy.canDelete();

    if (!canDelete) {
      res.sendStatus(401);
      return;
    }

    const deletedGoal = await destroyGoal(parseInt(goalId, 10));

    // destroy goal returns a promise with the number of deleted goals
    // it should be 1 or 0
    // if 0, the goal wasn't deleted, presumably because it wasn't found

    if (!deletedGoal) {
      res.sendStatus(404);
      return;
    }

    res.json(deletedGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function retrieveGoalById(req, res) {
  try {
    const { goalId } = req.params;

    const user = await userById(req.session.userId);
    const goal = await goalByIdWithActivityReportsAndRegions(goalId);

    const policy = new Goal(user, goal);

    if (!policy.canView()) {
      res.sendStatus(401);
      return;
    }

    const gId = parseInt(goalId, 10);

    const retrievedGoal = await goalById(gId);

    if (!retrievedGoal) {
      res.sendStatus(404);
      return;
    }

    res.json(retrievedGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function retrieveGoalByIdAndRecipient(req, res) {
  try {
    const { goalId, recipientId } = req.params;

    const user = await userById(req.session.userId);
    const goal = await goalByIdWithActivityReportsAndRegions(goalId);

    const policy = new Goal(user, goal);

    if (!policy.canView()) {
      res.sendStatus(401);
      return;
    }

    const gId = parseInt(goalId, 10);
    const rId = parseInt(recipientId, 10);

    const retrievedGoal = await goalByIdAndRecipient(gId, rId);

    if (!retrievedGoal) {
      res.sendStatus(404);
      return;
    }

    res.json(retrievedGoal);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
