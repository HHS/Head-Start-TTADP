import {
  Goal,
  Grant,
  Objective,
  ActivityReportObjective,
  GrantGoal,
} from '../models';

// eslint-disable-next-line import/prefer-default-export
export async function goalsForGrants(grantIds) {
  return Goal.findAll({
    include: {
      model: Grant,
      as: 'grants',
      attributes: ['id'],
      where: {
        id: grantIds,
      },
    },
    order: ['createdAt'],
  });
}

async function removeActivityReportObjectivesFromReport(reportId, transaction) {
  return ActivityReportObjective.destroy({
    where: {
      activityReportId: reportId,
    },
    transaction,
  });
}

async function removeGoals(goalsToRemove, transaction) {
  const goalsWithGrants = await Goal.findAll({
    attributes: ['id'],
    where: {
      id: goalsToRemove,
    },
    include: {
      attributes: ['id'],
      model: Grant,
      as: 'grants',
      required: true,
    },
    transaction,
  });

  const goalIdsToKeep = goalsWithGrants.map((g) => g.id);
  const goalsWithoutGrants = goalsToRemove.filter((id) => !goalIdsToKeep.includes(id));

  return Goal.destroy({
    where: {
      id: goalsWithoutGrants,
    },
    transaction,
  });
}

async function removeObjectives(currentObjectiveIds, transaction) {
  return Objective.destroy({
    where: {
      id: currentObjectiveIds,
    },
    transaction,
  });
}

async function removeUnusedObjectivesGoalsFromReport(reportId, currentGoals, transaction) {
  const previousObjectives = await ActivityReportObjective.findAll({
    where: {
      activityReportId: reportId,
    },
    include: {
      model: Objective,
      as: 'objective',
    },
  });

  const currentGoalIds = currentGoals.map((g) => g.id);
  const currentObjectiveIds = currentGoals.map((g) => g.objectives.map((o) => o.id)).flat();

  const previousGoalIds = previousObjectives.map((ro) => ro.objective.goalId);
  const previousObjectiveIds = previousObjectives.map((ro) => ro.objectiveId);

  const goalIdsToRemove = previousGoalIds.filter((id) => !currentGoalIds.includes(id));
  const objectiveIdsToRemove = [];
  await Promise.all(
    previousObjectiveIds.map(async (id) => {
      const notCurrent = !currentObjectiveIds.includes(id);
      const activityReportObjectives = await ActivityReportObjective
        .findAll({ where: { objectiveId: id } });
      const lastInstance = activityReportObjectives.length <= 1;
      if (notCurrent && lastInstance) {
        objectiveIdsToRemove.push(id);
      }
    }),
  );
  await removeActivityReportObjectivesFromReport(reportId, transaction);
  await removeObjectives(objectiveIdsToRemove, transaction);
  await removeGoals(goalIdsToRemove, transaction);
}

export async function saveGoalsForReport(goals, report, transaction) {
  await removeUnusedObjectivesGoalsFromReport(report.id, goals, transaction);

  return Promise.all(goals.map(async (goal) => {
    let goalId = goal.id;
    if (!Number.isInteger(goalId)) {
      const { id, ...newGoal } = goal;
      const savedGoal = await Goal.create(newGoal, { transaction });
      goalId = savedGoal.id;
    } else {
      const savedGoal = await Goal.findOne({ where: { id: goalId } });
      await savedGoal.update(goal);
    }

    return Promise.all(goal.objectives.map(async (objective) => {
      const { id, new: isNew, ...updatedFields } = objective;
      const updatedObjective = { ...updatedFields, goalId };
      let savedObjective;

      if (isNew) {
        savedObjective = await Objective.create(
          updatedObjective,
          { transaction },
        );
      } else {
        // Cannot use upsert here because we need the objective id and upsert does
        // not return the record that was updated/created
        savedObjective = await Objective.findOne({ where: { id } });
        await savedObjective.update(updatedObjective, { transaction });
      }

      return ActivityReportObjective.create({
        objectiveId: savedObjective.id,
        activityReportId: report.id,
      }, { transaction });
    }));
  }));
}

export async function copyGoalsToGrants(goals, grantIds, transaction) {
  const grants = await Grant.findAll({
    where: {
      id: grantIds,
    },
  });

  const grantGoals = [];
  goals.forEach((goal) => {
    grants.forEach((grant) => {
      grantGoals.push({
        grantId: grant.id,
        granteeId: grant.granteeId,
        goalId: goal.id,
      });
    });
  });

  await GrantGoal.bulkCreate(grantGoals, {
    ignoreDuplicates: true,
    transaction,
  });
}
