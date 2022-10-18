import {
  updateGoalStatusById,
  createOrUpdateGoalsForActivityReport,
  createOrUpdateGoals,
  goalsByIdsAndActivityReport,
  goalByIdWithActivityReportsAndRegions,
  goalByIdAndRecipient,
} from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';
import Goal from '../../policies/goals';
import { userById } from '../../services/users';
import { DECIMAL_BASE } from '../../constants';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

export async function createGoalsForReport(req, res) {
  try {
    const { goals, activityReportId, regionId } = req.body;

    const user = await userById(req.session.userId);

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
    await handleErrors(req, res, error, `${logContext}:CREATE_GOALS`);
  }
}

export async function changeGoalStatus(req, res) {
  try {
    const {
      goalIds, newStatus, closeSuspendReason, closeSuspendContext, oldStatus,
    } = req.body;

    const user = await userById(req.session.userId);
    const ids = goalIds.map((id) => parseInt(id, DECIMAL_BASE));

    let status = false;

    await Promise.all(ids.map(async (goalId) => {
      if (!status) {
        const goal = await goalByIdWithActivityReportsAndRegions(goalId);

        if (!goal) {
          status = 404;
          return status;
        }

        if (!new Goal(user, goal).canChangeStatus()) {
          status = 401;
          return status;
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
    );

    res.json(updatedGoal);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:CHANGE_GOAL_STATUS`);
  }
}

export async function retrieveGoalsByIds(req, res) {
  try {
    let { goalIds } = req.query;
    const { reportId } = req.query;
    goalIds = Array.isArray(goalIds) ? goalIds : [goalIds];
    const user = await userById(req.session.userId);

    let canView = true;
    goalIds.forEach(async (id) => {
      const goal = await goalByIdWithActivityReportsAndRegions(id);
      const policy = new Goal(user, goal);
      if (!policy.canView()) {
        canView = false;
      }
    });

    if (!canView) {
      res.sendStatus(401);
      return;
    }

    const gIds = goalIds.map((g) => parseInt(g, 10));
    const retrievedGoal = await goalsByIdsAndActivityReport(gIds, reportId);

    if (!retrievedGoal) {
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
    await handleErrors(req, res, error, `${logContext}:RETRIEVE_GOAL_BY_ID_AND_RECIPIENT`);
  }
}
