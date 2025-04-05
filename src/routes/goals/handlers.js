import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  updateGoalStatusById,
  createOrUpdateGoalsForActivityReport,
  createOrUpdateGoals,
  goalsByIdsAndActivityReport,
  goalByIdWithActivityReportsAndRegions,
  destroyGoal,
} from '../../goalServices/goals';
import { sequelize } from '../../models';
import goalsFromTemplate from '../../goalServices/goalsFromTemplate';
import _changeGoalStatus from '../../goalServices/changeGoalStatus';
import getGoalsMissingDataForActivityReportSubmission from '../../goalServices/getGoalsMissingDataForActivityReportSubmission';
import handleErrors from '../../lib/apiErrorHandler';
import Goal from '../../policies/goals';
import { userById } from '../../services/users';
import { currentUserId } from '../../services/currentUser';

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

export async function getMissingDataForActivityReport(req, res) {
  try {
    const { regionId } = req.params;
    const { goalIds } = req.query;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const canCreate = new Goal(user, null, parseInt(regionId, DECIMAL_BASE)).canCreate();

    if (!canCreate) {
      res.sendStatus(401);
      return;
    }

    // goalIds can be a string or an array of strings
    const missingData = await getGoalsMissingDataForActivityReportSubmission([goalIds].flat());
    res.json(missingData);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:CREATE_GOALS_FOR_REPORT`);
  }
}

export async function createGoalsFromTemplate(req, res) {
  try {
    const { regionId } = req.body;
    const { goalTemplateId } = req.params;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const canCreate = new Goal(user, null, parseInt(regionId, DECIMAL_BASE)).canCreate();

    if (!canCreate) {
      res.sendStatus(401);
    }

    const newGoals = await goalsFromTemplate(goalTemplateId, userId, req.body);

    res.json(newGoals);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:CREATE_GOALS`);
  }
}

export async function createGoals(req, res) {
  try {
    const { goals } = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    let canCreate = true;

    goals.forEach((goal) => {
      if (canCreate && !new Goal(user, null, parseInt(goal.regionId, DECIMAL_BASE)).canCreate()) {
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

export async function reopenGoal(req, res) {
  try {
    const { goalId, reason, context } = req.body;
    const userId = await currentUserId(req, res);

    const updatedGoal = await _changeGoalStatus({
      goalId,
      userId,
      newStatus: 'In Progress',
      reason,
      context,
    });

    if (!updatedGoal) {
      res.sendStatus(httpCodes.BAD_REQUEST);
    }

    res.json(updatedGoal);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:REOPEN_GOAL`);
  }
}

export async function changeGoalStatus(req, res) {
  try {
    const {
      goalIds,
      newStatus,
      closeSuspendReason,
      closeSuspendContext,
      oldStatus,
    } = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const ids = goalIds.map((id) => parseInt(id, DECIMAL_BASE));

    let status = false;
    let previousStatus = [];

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

        if (goal.statusChanges) {
          goal.statusChanges.forEach(({ oldStatus: o, newStatus: n }) => {
            previousStatus = [...new Set([...previousStatus, o, n])];
          });
        }
      }

      return status;
    }));

    if (status) {
      res.sendStatus(status);
      return;
    }

    // If the goal is being suspended, automatically suspend any "in progress" objectives
    if (newStatus === 'Suspended') {
      // For each goal, find all "in progress" objectives and update them to "suspended"
      await Promise.all(ids.map(async (goalId) => {
        await sequelize.models.Objective.update(
          { status: 'Suspended' },
          {
            where: {
              goalId,
              status: 'In Progress',
            },
          },
        );
      }));
    }

    const updatedGoal = await updateGoalStatusById(
      ids,
      userId,
      oldStatus,
      newStatus,
      closeSuspendReason,
      closeSuspendContext,
      previousStatus,
    );

    if (!updatedGoal) {
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
      res.sendStatus(httpCodes.UNAUTHORIZED);
      return;
    }

    const deletedGoal = await destroyGoal(ids);

    if (!deletedGoal) {
      res.sendStatus(httpCodes.NOT_FOUND);
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

/**
 * Retrieves the history of goals with the same template as the specified goal
 * This handler is used by ViewStandardGoals to display goal status changes
 * Returns an array of goals with the same goalTemplateId for this specific grant
 */
export async function getGoalHistory(req, res) {
  try {
    const { goalId } = req.params;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const id = parseInt(goalId, DECIMAL_BASE);

    const goal = await sequelize.models.Goal.findByPk(id);
    if (!goal) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    const grantRecord = await sequelize.models.Grant.findByPk(goal.grantId);
    if (!grantRecord) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    const hasPermissionInRegion = user.permissions.some(
      (permission) => permission.regionId === grantRecord.regionId,
    );

    if (!hasPermissionInRegion) {
      res.sendStatus(httpCodes.UNAUTHORIZED);
      return;
    }

    const goalsWithDetails = await sequelize.models.Goal.findAll({
      where: {
        goalTemplateId: goal.goalTemplateId,
        grantId: goal.grantId,
      },
      include: [
        {
          model: sequelize.models.GoalStatusChange,
          as: 'statusChanges',
          include: [
            {
              model: sequelize.models.User,
              as: 'user',
              attributes: ['name'],
            },
          ],
        },
        {
          model: sequelize.models.Objective,
          as: 'objectives',
          required: false,
          include: [
            {
              model: sequelize.models.ActivityReportObjective,
              as: 'activityReportObjectives',
              required: false,
              include: [
                {
                  model: sequelize.models.ActivityReport,
                  as: 'activityReport',
                  attributes: ['id', 'displayId', 'startDate', 'endDate', 'calculatedStatus'],
                },
                {
                  model: sequelize.models.Topic,
                  as: 'topics',
                  attributes: ['id', 'name'],
                },
                {
                  model: sequelize.models.Resource,
                  as: 'resources',
                  attributes: ['id', 'url', 'title'],
                },
              ],
            },
            {
              model: sequelize.models.ActivityReport,
              as: 'activityReports',
              required: false,
              attributes: ['id', 'displayId', 'startDate', 'endDate', 'calculatedStatus'],
            },
          ],
        },
        {
          model: sequelize.models.Grant,
          as: 'grant',
        },
        {
          model: sequelize.models.GoalTemplate,
          as: 'goalTemplate',
        },
        {
          model: sequelize.models.GoalFieldResponse,
          as: 'responses',
        },
        {
          model: sequelize.models.GoalCollaborator,
          as: 'goalCollaborators',
          include: [
            {
              model: sequelize.models.User,
              as: 'user',
              attributes: ['name'],
            },
            {
              model: sequelize.models.CollaboratorType,
              as: 'collaboratorType',
              attributes: ['name'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!goalsWithDetails.length) {
      res.json([]);
      return;
    }

    res.json(goalsWithDetails);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:GET_GOAL_HISTORY`);
  }
}
