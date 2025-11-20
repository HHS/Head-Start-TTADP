import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
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

    const newGoals = await createOrUpdateGoalsForActivityReport(goals, activityReportId, userId);
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
          {
            status: 'Suspended',
            closeSuspendReason, // propagate reason from goal
            closeSuspendContext, // propagate context from goal
          },
          {
            where: {
              goalId,
              status: 'In Progress',
            },
            individualHooks: true,
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

export async function retrieveObjectiveOptionsByGoalTemplate(req, res) {
  try {
    const { reportId, goalTemplateId } = req.query;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    // Get the grant from the activity report.
    const activityReport = await sequelize.models.ActivityReport.findByPk(reportId, {
      include: [
        {
          model: sequelize.models.Grant,
          as: 'grants',
          attributes: ['id', 'regionId'],
        },
      ],
    });

    // Get grantIds.
    const grantIds = activityReport.grants.map((g) => g.id);
    const uniqueGrantIds = [...new Set(grantIds)];

    // Get all goals for the grant / goal template id combination.
    const goals = await sequelize.models.Goal.findAll({
      where: {
        grantId: uniqueGrantIds,
        goalTemplateId,
      },
      include: [
        {
          model: sequelize.models.Grant,
          as: 'grant',
          attributes: ['id', 'regionId'],
        },
      ],
    });
    const goalIds = goals.map((g) => parseInt(g.id, 10));

    // Validate that the user can view all goals.
    const permissions = await Promise.all(goals.map(async (goal) => {
      const policy = new Goal(user, goal);
      return policy.canView();
    }));
    const canView = permissions.every((permission) => permission);
    if (!canView) {
      res.sendStatus(401);
      return;
    }
    const retrievedGoal = await goalsByIdsAndActivityReport(goalIds, reportId);

    // Create unique objectives from all retrieved standard goals.
    const uniqueObjectives = retrievedGoal.reduce((acc, goal) => {
      goal.objectives.forEach((objective) => {
        if (!acc.some((obj) => obj.title === objective.title)) {
          acc.push(objective);
        }
      });
      return acc;
    }, []);

    res.json(uniqueObjectives);
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
        prestandard: goal.prestandard,
        [Op.or]: [
          {
            createdVia: {
              [Op.ne]: 'activityReport',
            },
          },
          {
            onApprovedAR: true,
          },
        ],
      },
      attributes: {
        include: [
          [
            sequelize.literal('"statusChanges"."reason"'), 'reason',
          ],
          [
            sequelize.literal('"goalTemplate"."standard"'),
            'standard',
          ],
        ],
      },
      include: [
        {
          model: sequelize.models.GoalStatusChange,
          as: 'statusChanges',
          attributes: ['id', 'createdAt', 'newStatus', 'oldStatus', 'reason', 'performedAt'],
          include: [
            {
              model: sequelize.models.User,
              as: 'user',
              attributes: ['name'],
              include: [{
                model: sequelize.models.Role,
                as: 'roles',
                attributes: ['name'],
                through: { attributes: [] },
              }],
            },
          ],
        },
        {
          model: sequelize.models.Objective,
          as: 'objectives',
          required: false,
          attributes: ['id', 'title', 'status'],
          where: {
            [Op.or]: [
              { createdVia: 'rtr' },
              { onApprovedAR: true },
            ],
          },
          include: [
            {
              model: sequelize.models.ActivityReportObjective,
              as: 'activityReportObjectives',
              required: false,
              attributes: ['id'],
              include: [
                {
                  model: sequelize.models.ActivityReport,
                  as: 'activityReport',
                  attributes: ['id', 'displayId'],
                  where: {
                    calculatedStatus: REPORT_STATUSES.APPROVED,
                  },
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
                {
                  model: sequelize.models.File,
                  as: 'files',
                  attributes: ['id', 'originalFileName', 'fileSize', 'url', 'key'],
                },
                {
                  separate: true,
                  model: sequelize.models.ActivityReportObjectiveCourse,
                  as: 'activityReportObjectiveCourses',
                  required: false,
                  include: [
                    {
                      model: sequelize.models.Course,
                      as: 'course',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: sequelize.models.Grant,
          as: 'grant',
          attributes: ['number'],
        },
        {
          model: sequelize.models.GoalTemplate,
          as: 'goalTemplate',
          attributes: ['templateName', 'standard'],
        },
        {
          model: sequelize.models.GoalFieldResponse,
          as: 'responses',
          attributes: ['id', 'response'],
        },
        {
          model: sequelize.models.GoalCollaborator,
          as: 'goalCollaborators',
          attributes: ['id'],
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
      order: [
        ['createdAt', 'DESC'],
        [{ model: sequelize.models.GoalStatusChange, as: 'statusChanges' }, 'createdAt', 'DESC'],
      ],
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
