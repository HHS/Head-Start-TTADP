import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  updateGoalStatusById,
  createOrUpdateGoalsForActivityReport,
  createOrUpdateGoals,
  goalsByIdsAndActivityReport,
  goalByIdWithActivityReportsAndRegions,
  goalByIdAndRecipient,
  destroyGoal,
  getGoalIdsBySimilarity,
} from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';
import Goal from '../../policies/goals';
import { userById } from '../../services/users';
import { currentUserId } from '../../services/currentUser';
import { similarGoalsForRecipient } from '../../services/similarity';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

export async function createGoalsForReport(req, res) {
  try {
    const { goals, activityReportId, regionId } = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const canCreate = new Goal(user, null, regionId).canCreate();

    if (!canCreate) {
      res.sendStatus(401);
      return;
    }

    const newGoals = await createOrUpdateGoalsForActivityReport(goals, activityReportId);
    res.json(newGoals);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:CREATE_GOALS_FOR_REPORT`);
  }
}

export async function createGoals(req, res) {
  try {
    const { goals } = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);

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
    await handleErrors(req, res, error, `${logContext}:CREATE_GOALS`);
  }
}

export async function changeGoalStatus(req, res) {
  try {
    const {
      goalIds, newStatus, closeSuspendReason, closeSuspendContext, oldStatus,
    } = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const ids = goalIds.map((id) => parseInt(id, DECIMAL_BASE));

    let status = false;
    const previousStatus = [];

    await Promise.all(ids.map(async (goalId) => {
      if (!status) {
        const goal = await goalByIdWithActivityReportsAndRegions(goalId);

        if (!goal) {
          status = httpCodes.NOT_FOUND;
          return status;
        }

        if (!new Goal(user, goal).canChangeStatus()) {
          status = httpCodes.UNAUTHORIZED;
          return status;
        }

        if (goal.previousStatus && !previousStatus.includes(goal.previousStatus)) {
          previousStatus.push(goal.previousStatus);
        }
      }

      return status;
    }));

    if (status) {
      res.sendStatus(status);
      return;
    }

    const updatedGoal = await updateGoalStatusById(
      ids,
      oldStatus,
      newStatus,
      closeSuspendReason,
      closeSuspendContext,
      previousStatus,
    );

    if (!updatedGoal) {
      // the updateGoalStatusById function returns false
      // if the goal status change is not allowed
      res.sendStatus(httpCodes.BAD_REQUEST);
    }

    res.json(updatedGoal);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:CHANGE_GOAL_STATUS`);
  }
}
export async function deleteGoal(req, res) {
  try {
    const { goalIds } = req.query;
    const ids = [goalIds].flatMap((id) => parseInt(id, DECIMAL_BASE));

    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const permissions = await Promise.all(ids.map(async (goalId) => {
      const goal = await goalByIdWithActivityReportsAndRegions(goalId);
      const policy = new Goal(user, goal);
      return policy.canDelete();
    }));

    if (!permissions.every((permission) => permission)) {
      res.sendStatus(401);
      return;
    }

    const deletedGoal = await destroyGoal(ids);

    if (!deletedGoal) {
      res.sendStatus(404);
      return;
    }

    res.json(deletedGoal);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:DELETE_GOAL`);
  }
}

export async function retrieveGoalsByIds(req, res) {
  try {
    let { goalIds } = req.query;
    const { reportId } = req.query;
    goalIds = Array.isArray(goalIds) ? goalIds : [goalIds];
    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const permissions = await Promise.all(goalIds.map(async (id) => {
      const goal = await goalByIdWithActivityReportsAndRegions(id);

      const policy = new Goal(user, goal);
      return policy.canView();
    }));

    const canView = permissions.every((permission) => permission);

    if (!canView) {
      res.sendStatus(401);
      return;
    }

    const gIds = goalIds.map((g) => parseInt(g, 10));
    const retrievedGoal = await goalsByIdsAndActivityReport(gIds, reportId);

    if (!retrievedGoal || !retrievedGoal.length) {
      res.sendStatus(404);
      return;
    }

    res.json(retrievedGoal);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:RETRIEVE_GOALS_BY_IDS`);
  }
}

export async function retrieveGoalByIdAndRecipient(req, res) {
  try {
    const { goalId, recipientId } = req.params;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
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
    await handleErrors(req, res, error, `${logContext}:RETRIEVE_GOAL_BY_ID_AND_RECIPIENT`);
  }
}

export async function getSimilarGoalsForRecipient(req, res) {
  const recipientId = parseInt(req.params.recipient_id, 10);

  if (Number.isNaN(recipientId)) {
    return res.status(400).send('Recipient ID must be an integer');
  }

  const cluster = Object.prototype.hasOwnProperty.call(req.query, 'cluster');
  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  try {
    const similarGoalIds = await similarGoalsForRecipient(recipientId, cluster);

    const ids = Array.from(similarGoalIds.reduce((acc, resp) => {
      const id1 = parseInt(resp.goal1.id, 10);
      const id2 = parseInt(resp.goal2.id, 10);
      acc.add(id1);
      acc.add(id2);
      return acc;
    }, new Set()));

    const canView = await Promise.all(ids.map(async (id) => {
      const goal = await goalByIdWithActivityReportsAndRegions(id);
      return new Goal(user, goal).canView();
    }));

    if (!canView.every((permission) => permission)) {
      return res.sendStatus(401);
    }

    return res.json(await getGoalIdsBySimilarity(similarGoalIds));
  } catch (error) {
    return res.status(500);
  }
}
