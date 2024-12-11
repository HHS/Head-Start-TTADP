import { v4 as uuid } from 'uuid';
import db from '../models';
import {
  createGoal, createReport, destroyGoal, destroyReport,
} from '../testUtils';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';

const {
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
  MonitoringClassSummary,
  MonitoringFindingHistory,
  MonitoringFindingLink,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingStandard,
  MonitoringStandard,
  MonitoringStandardLink,
  MonitoringFindingStatusLink,
  MonitoringFindingStatus,
  Objective,
  Grant,
  ActivityReportObjective,
  Goal,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCitation,
  Topic,
  ActivityReport,
  ActivityReportCollaborator,
  User,
  Role,
} = db;

async function createAdditionalMonitoringData(
  findingId: string,
  reviewId: string,
  granteeId: string,
) {
  const timestamps = {
    sourceCreatedAt: new Date(),
    sourceUpdatedAt: new Date(),
    sourceDeletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  await MonitoringFinding.create({
    findingId,
    name: 'Finding 1',
    statusId: 6006,
    findingType: 'Finding Type',
    hash: 'hash',
    source: 'source',
    ...timestamps,
  });

  await MonitoringFindingGrant.create({
    findingId,
    granteeId,
    statusId: 6006,
    findingType: 'Finding Type',
    hash: 'hash',
    ...timestamps,
  });

  await MonitoringFindingLink.findOrCreate({
    where: { findingId },
  });

  await MonitoringFindingHistory.create({
    reviewId,
    findingHistoryId: uuid(),
    findingId,
    statusId: 6006,
    narrative: 'narrative',
    ordinal: 1,
    determination: 'determination',
    name: 'Review Name',
    ...timestamps,
  });

  await MonitoringStandard.create({
    contentId: 'contentId',
    standardId: 99_999,
    citation: '1234',
    text: 'text',
    guidance: 'guidance',
    citable: 1,
    hash: 'hash',
    ...timestamps,
  });

  await MonitoringStandardLink.findOrCreate({
    where: { standardId: 99_999 },
  });

  await MonitoringFindingStandard.create({
    standardId: 99_999,
    findingId,
    name: 'Standard',
    ...timestamps,
  });

  await MonitoringFindingStatusLink.findOrCreate({
    where: { statusId: 6006 },
  });

  await MonitoringFindingStatus.findOrCreate({
    where: { statusId: 6006 },
    defaults: {
      statusId: 6006,
      name: 'Complete',
      ...timestamps,
    },
  });

  return {
    findingId,
    reviewId,
  };
}

async function destroyAdditionalMonitoringData(findingId: string, reviewId: string) {
  await MonitoringFindingStandard.destroy({ where: { findingId }, force: true });
  await MonitoringFindingStatus.destroy({ where: { statusId: 6006 }, force: true });
  await MonitoringFindingGrant.destroy({ where: { findingId }, force: true });
  await MonitoringFindingHistory.destroy({ where: { reviewId }, force: true });
  await MonitoringStandard.destroy({ where: { standardId: 99_999 }, force: true });
  await MonitoringFinding.destroy({ where: { findingId }, force: true });
  await MonitoringFindingStatusLink.destroy({ where: { statusId: 6006 }, force: true });
  await MonitoringFindingLink.destroy({ where: { findingId }, force: true });
  await MonitoringStandardLink.destroy({ where: { standardId: 99_999 }, force: true });
}

async function createMonitoringData(
  grantNumber: string,
  reviewId = 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
  granteeId = '14FC5A81-8E27-4B06-A107-9C28762BC2F6',
  statusId = 6006,
  contentId = '653DABA6-DE64-4081-B5B3-9A126487E8F',
  findingId = uuid(),
) {
  await MonitoringClassSummary.findOrCreate({
    where: { grantNumber },
    defaults: {
      reviewId,
      grantNumber,
      emotionalSupport: 6.2303,
      classroomOrganization: 5.2303,
      instructionalSupport: 3.2303,
      reportDeliveryDate: '2023-05-22 21:00:00-07',
      hash: 'seedhashclasssum1',
      sourceCreatedAt: '2023-05-22 21:00:00-07',
      sourceUpdatedAt: '2023-05-22 21:00:00-07',
    },
  });

  await MonitoringReviewGrantee.findOrCreate({
    where: { grantNumber },
    defaults: {
      reviewId,
      granteeId,
      grantNumber,
      sourceCreatedAt: '2024-02-12 14:31:55.74-08',
      sourceUpdatedAt: '2024-02-12 14:31:55.74-08',
      createTime: '2023-11-14 21:00:00-08',
      updateTime: '2024-02-12 14:31:55.74-08',
      updateBy: 'Support Team',
    },
  });

  await MonitoringReview.findOrCreate({
    where: { reviewId },
    defaults: {
      reviewId,
      contentId,
      statusId,
      startDate: '2024-02-12',
      endDate: '2024-02-12',
      reviewType: 'FA-1',
      reportDeliveryDate: '2023-02-21 21:00:00-08',
      outcome: 'Complete',
      hash: 'seedhashrev2',
      sourceCreatedAt: '2023-02-22 21:00:00-08',
      sourceUpdatedAt: '2023-02-22 21:00:00-08',
      name: 'REVIEW!!!',
    },
  });

  await MonitoringReviewLink.findOrCreate({
    where: { reviewId },
    defaults: {
      reviewId,
    },
  });

  await MonitoringReviewStatusLink.findOrCreate({
    where: { statusId },
    defaults: {
      statusId,
    },
  });

  await MonitoringReviewStatus.findOrCreate({
    where: { statusId },
    defaults: {
      statusId,
      name: 'Complete',
      sourceCreatedAt: '2024-02-12 14:31:55.74-08',
      sourceUpdatedAt: '2024-02-12 14:31:55.74-08',
    },
  });

  return {
    grantNumber,
    reviewId,
    granteeId,
    statusId,
    contentId,
    findingId,
  };
}

async function destroyMonitoringData(
  grantNumber: string,
  reviewId = 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
  statusId = 6006,
) {
  const grantees = await MonitoringReviewGrantee.findAll({
    attribtes: ['id'],
    where: { grantNumber },
  });

  const granteeIds = grantees.map((grantee) => grantee.id);

  await MonitoringReviewGrantee.destroy({
    where: { id: granteeIds },
    force: true,
    individualHooks: true,
  });

  await MonitoringReviewGrantee.destroy(
    { where: { reviewId }, force: true, individualHooks: true },
  );
  await MonitoringClassSummary.destroy({
    where: { reviewId }, force: true, individualHooks: true,
  });
  await MonitoringReview.destroy({
    where: { reviewId },
    force: true,
    individualHooks: true,
  });

  await MonitoringReview.destroy({
    where: { statusId },
    force: true,
    individualHooks: true,
  });

  await MonitoringReviewStatus.destroy({
    where: { statusId },
    force: true,
    individualHooks: true,
  });

  await MonitoringFindingHistory.destroy({
    where: {
      reviewId,
    },
    force: true,
    individualHooks: true,
  });

  await MonitoringReviewLink.destroy({
    where: { reviewId },
    force: true,
    individualHooks: true,
  });

  await MonitoringReviewStatusLink.destroy({
    where: { statusId },
    force: true,
    individualHooks: true,
  });
}

async function createReportAndCitationData(grantNumber: string, findingId: string) {
  const grant = await Grant.findOne({
    where: { number: grantNumber },
    defaults: {
      number: grantNumber,
    },
  });

  const goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });
  const objective = await Objective.create({
    goalId: goal.id,
    title: 'Objective Title',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  });

  const report = await createReport({
    activityRecipients: [{ grantId: grant.id }],
    regionId: grant.regionId,
    userId: 1,
  });

  const aro = await ActivityReportObjective.create({
    activityReportId: report.id,
    objectiveId: objective.id,
  });

  await ActivityReportCollaborator.create({
    activityReportId: report.id,
    userId: 1,
  });

  const topic = await Topic.create({
    name: 'Spleunking',
  });

  await ActivityReportObjectiveTopic.create({
    activityReportObjectiveId: aro.id,
    topicId: topic.id,
  });

  const citation = await ActivityReportObjectiveCitation.create({
    activityReportObjectiveId: aro.id,
    citation: 'Citation',
    monitoringReferences: [{
      findingId,
      grantNumber,
      reviewName: 'REVIEW!!!',
    }],
  });

  return {
    goal,
    objective,
    report,
    topic,
    citation,
  };
}

async function destroyReportAndCitationData(
  goal:{ id: number },
  objective: { id: number },
  report: { id: number },
  topic: { id: number },
  citation: { id: number },
) {
  await ActivityReportObjectiveCitation.destroy({
    where: { id: citation.id },
    force: true,
    individualHooks: true,
  });

  await ActivityReportObjectiveTopic.destroy({
    where: { topicId: topic.id },
    force: true,
    individualHooks: true,
  });

  await Topic.destroy({
    where: { id: topic.id },
    force: true,
    individualHooks: true,
  });

  await ActivityReportCollaborator.destroy({
    where: { activityReportId: report.id },
    force: true,
    individualHooks: true,
  });

  await ActivityReportObjective.destroy({
    where: { objectiveId: objective.id },
    force: true,
    individualHooks: true,
  });

  await destroyReport(report);
  await Objective.destroy({
    where: { id: objective.id },
    force: true,
    individualHooks: true,
  });

  await destroyGoal(goal);
}

export {
  createMonitoringData,
  destroyMonitoringData,
  createAdditionalMonitoringData,
  destroyAdditionalMonitoringData,
  createReportAndCitationData,
  destroyReportAndCitationData,
};
