/* eslint-disable import/prefer-default-export */
import {
  Objective,
  ObjectiveResource,
  ObjectiveRole,
  ObjectiveTopic,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  ActivityReportObjectiveTopic,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './goals';

export async function cacheObjectiveMetadata(objectiveId, activityReportObjectiveId) {
  const resources = await ObjectiveResource.findAll({ where: { objectiveId } });
  const roles = await ObjectiveRole.findAll({ where: { objectiveId } });
  const topics = await ObjectiveTopic.findAll({ where: { objectiveId } });
  return Promise.all([
    Promise.all(resources.map(async (resource) => ActivityReportObjectiveResource.upsert({
      activityReportObjectiveId,
      userProvidedUrl: resource.userProvidedUrl,
    }))),
    Promise.all(roles.map(async (role) => ActivityReportObjectiveRole.upsert({
      activityReportObjectiveId,
      roleId: role.roleId,
    }))),
    Promise.all(topics.map(async (topic) => ActivityReportObjectiveTopic.upsert({
      activityReportObjectiveId,
      topicId: topic.topicId,
    }))),
  ]);
}

export async function saveObjectivesForReport(objectives, report) {
  const updatedObjectives = await Promise.all(objectives.map(async (objective) => {
    if (objective.isNew) {
      return Promise.all(objective.recipientIds.map(async (recipient) => {
        const [newObjective] = await Objective.findOrCreate({
          where: {
            status: objective.status,
            title: objective.title,
            otherEntityId: recipient,
          },
        });

        const [aro] = await ActivityReportObjective.findOrCreate({
          where: {
            objectiveId: newObjective.id,
            activityReportId: report.id,
          },
        });

        await aro.update({
          ttaProvided: objective.ttaProvided,
          status: newObjective.status,
        }, { individualHooks: true });

        await cacheObjectiveMetadata(newObjective.id, aro.id);

        return newObjective;
      }));
    }
    return Promise.all(objective.recipientIds.map(async (recipient) => {
      const existingObjective = await Objective.findOne({
        where: {
          id: objective.ids,
          otherEntityId: recipient,
        },
      });

      if (existingObjective) {
        const [aro] = await ActivityReportObjective.findOrCreate({
          where: {
            ttaProvided: objective.ttaProvided,
            objectiveId: existingObjective.id,
            activityReportId: report.id,
            status: objective.status,
          },
        });

        await cacheObjectiveMetadata(existingObjective.id, aro.id);

        await existingObjective.update({
          status: objective.status,
          title: objective.title,
        }, { individualHooks: true });

        return existingObjective;
      }

      const [newObjective] = await Objective.findOrCreate({
        where: {
          status: objective.status,
          title: objective.title,
          otherEntityId: recipient,
        },
      });

      const [aro] = await ActivityReportObjective.create({
        where: {
          ttaProvided: objective.ttaProvided,
          objectiveId: newObjective.id,
          activityReportId: report.id,
          status: objective.status,
        },
      });

      await cacheObjectiveMetadata(newObjective.id, aro.id);

      return newObjective;
    }));
  }));

  const currentObjectives = updatedObjectives.flat();
  return removeUnusedGoalsObjectivesFromReport(report.id, currentObjectives);
}
