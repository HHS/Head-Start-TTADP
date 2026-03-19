import { v4 as uuid } from 'uuid';
import { Op } from 'sequelize';
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
  MonitoringFindingHistoryStatus,
  MonitoringFindingStatus,
  MonitoringFindingHistoryStatusLink,
  Objective,
  Grant,
  Citation,
  GrantCitation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantDeliveredReview,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCitation,
  Topic,
  ActivityReportCollaborator,
} = db;

async function createAdditionalMonitoringData(
  findingId: string,
  reviewId: string,
  granteeId: string,
  options: {
    statusId?: number;
    standardId?: number;
  } = {},
) {
  const {
    statusId = 6006,
    standardId = 99_999,
  } = options;

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
    statusId,
    findingType: 'Finding Type',
    hash: 'hash',
    source: 'source',
    ...timestamps,
  });

  await MonitoringFindingGrant.create({
    findingId,
    granteeId,
    statusId,
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
    statusId,
    narrative: 'narrative',
    ordinal: 1,
    determination: 'determination',
    name: 'Review Name',
    ...timestamps,
  });

  await MonitoringFindingHistoryStatusLink.findOrCreate({
    where: {
      statusId,
    },
  });

  await MonitoringFindingHistoryStatus.findOrCreate({
    where: { statusId },
    defaults: {
      statusId,
      name: 'Complete',
      ...timestamps,
    },
  });

  await MonitoringStandard.findOrCreate({
    where: { standardId },
    defaults: {
      contentId: `content-${standardId}`,
      standardId,
      citation: '1234',
      text: 'text',
      guidance: 'guidance',
      citable: 1,
      hash: 'hash',
      ...timestamps,
    },
  });

  await MonitoringStandardLink.findOrCreate({
    where: { standardId },
  });

  await MonitoringFindingStandard.create({
    standardId,
    findingId,
    name: 'Standard',
    ...timestamps,
  });

  await MonitoringFindingStatusLink.findOrCreate({
    where: { statusId },
  });

  await MonitoringFindingStatus.findOrCreate({
    where: { statusId },
    defaults: {
      statusId,
      name: 'Complete',
      ...timestamps,
    },
  });

  return {
    findingId,
    reviewId,
  };
}

async function destroyAdditionalMonitoringData(
  findingId: string,
  reviewId: string,
  options: {
    statusId?: number;
    standardId?: number;
  } = {},
) {
  const {
    statusId = 6006,
    standardId = 99_999,
  } = options;

  const findings = await MonitoringFinding.findAll({
    attributes: ['findingId'],
    where: {
      [Op.or]: [
        { findingId },
        { statusId },
      ],
    },
  });

  const findingIds = [...new Set([
    findingId,
    ...findings.map((finding) => finding.findingId),
  ])];

  await MonitoringFindingStandard.destroy({ where: { findingId: findingIds }, force: true });
  await MonitoringFindingGrant.destroy({
    where: {
      [Op.or]: [
        { findingId: findingIds },
        { statusId },
      ],
    },
    force: true,
  });
  await MonitoringFindingHistory.destroy({
    where: {
      [Op.or]: [
        { reviewId },
        { statusId },
        { findingId: findingIds },
      ],
    },
    force: true,
  });
  await MonitoringFinding.destroy({
    where: {
      [Op.or]: [
        { findingId: findingIds },
        { statusId },
      ],
    },
    force: true,
  });
  await MonitoringFindingHistoryStatus.destroy({ where: { statusId }, force: true });
  await MonitoringFindingHistoryStatusLink.destroy({ where: { statusId }, force: true });
  await MonitoringFindingStatus.destroy({ where: { statusId }, force: true });
  await MonitoringFindingStatusLink.destroy({ where: { statusId }, force: true });
  await MonitoringFindingLink.destroy({ where: { findingId: findingIds }, force: true });
  await MonitoringStandard.destroy({ where: { standardId }, force: true });
  await MonitoringStandardLink.destroy({ where: { standardId }, force: true });
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
    where: { grantNumber, reviewId },
    defaults: {
      reviewId,
      grantNumber,
      emotionalSupport: 6.2303,
      classroomOrganization: 5.2303,
      instructionalSupport: 3.2303,
      reportDeliveryDate: '2025-05-22 21:00:00-07',
      hash: 'seedhashclasssum1',
      sourceCreatedAt: '2024-05-22 21:00:00-07',
      sourceUpdatedAt: '2024-05-22 21:00:00-07',
    },
  });

  await MonitoringReviewGrantee.findOrCreate({
    where: {
      grantNumber,
      reviewId,
      granteeId,
    },
    defaults: {
      reviewId,
      granteeId,
      grantNumber,
      sourceCreatedAt: '2024-02-12 14:31:55.74-08',
      sourceUpdatedAt: '2024-02-12 14:31:55.74-08',
      createTime: '2024-11-14 21:00:00-08',
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
      reportDeliveryDate: '2025-02-21 21:00:00-08',
      outcome: 'Complete',
      hash: 'seedhashrev2',
      sourceCreatedAt: '2024-02-22 21:00:00-08',
      sourceUpdatedAt: '2024-02-22 21:00:00-08',
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
    attributes: ['id'],
    where: {
      [Op.or]: [
        { grantNumber, reviewId },
        { grantNumber },
        { reviewId },
      ],
    },
  });

  const granteeIds = grantees.map((grantee) => grantee.id);

  await MonitoringReviewGrantee.destroy({
    where: { id: granteeIds },
    force: true,
    individualHooks: true,
  });

  await MonitoringReviewGrantee.destroy(
    {
      where: {
        [Op.or]: [
          { grantNumber, reviewId },
          { grantNumber },
          { reviewId },
        ],
      },
      force: true,
      individualHooks: true,
    },
  );
  await MonitoringClassSummary.destroy({
    where: {
      [Op.or]: [
        { grantNumber, reviewId },
        { grantNumber },
        { reviewId },
      ],
    },
    force: true,
    individualHooks: true,
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
  const objectiveOne = await Objective.create({
    goalId: goal.id,
    title: 'Objective Title',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  });

  const objectiveTwo = await Objective.create({
    goalId: goal.id,
    title: 'Objective Title Two',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  });

  const reportOne = await createReport({
    activityRecipients: [{ grantId: grant.id }],
    regionId: grant.regionId,
    userId: 1,
  });

  const aroOne = await ActivityReportObjective.create({
    activityReportId: reportOne.id,
    objectiveId: objectiveOne.id,
  });

  await ActivityReportCollaborator.create({
    activityReportId: reportOne.id,
    userId: 1,
  });

  const reportTwo = await createReport({
    activityRecipients: [{ grantId: grant.id }],
    regionId: grant.regionId,
    userId: 1,
    endDate: new Date(),
  });

  const aroTwo = await ActivityReportObjective.create({
    activityReportId: reportTwo.id,
    objectiveId: objectiveTwo.id,
  });

  await ActivityReportCollaborator.create({
    activityReportId: reportTwo.id,
    userId: 1,
  });

  const topic = await Topic.create({
    name: 'Spleunking',
  });

  await ActivityReportObjectiveTopic.create({
    activityReportObjectiveId: aroOne.id,
    topicId: topic.id,
  });

  await ActivityReportObjectiveTopic.create({
    activityReportObjectiveId: aroTwo.id,
    topicId: topic.id,
  });

  const [factCitation] = await Citation.findOrCreate({
    where: { finding_uuid: findingId },
    defaults: {
      mfid: Math.abs(parseInt(findingId.replace(/\D/g, '').slice(0, 9), 10)) || Date.now(),
      finding_uuid: findingId,
      citation: '1234',
      raw_status: 'Complete',
      calculated_status: 'Complete',
      raw_finding_type: 'determination',
      calculated_finding_type: 'determination',
      source_category: 'source',
      active: true,
      last_review_delivered: true,
    },
  });

  await GrantCitation.findOrCreate({
    where: {
      grantId: grant.id,
      citationId: factCitation.id,
    },
    defaults: {
      grantId: grant.id,
      citationId: factCitation.id,
    },
  });

  const flattenedReference = {
    findingId,
    grantId: grant.id,
    grantNumber,
    reviewName: 'REVIEW!!!',
    findingType: 'determination',
    findingSource: 'source',
    acro: 'AOC',
    severity: 3,
    reportDeliveryDate: '2025-02-22',
    monitoringFindingStatusName: 'Complete',
    citation: factCitation.citation,
  };

  const citationOne = await ActivityReportObjectiveCitation.create({
    activityReportObjectiveId: aroOne.id,
    citationId: factCitation.id,
    citation: factCitation.citation,
    monitoringReferences: [flattenedReference],
    findingId,
    grantId: grant.id,
    grantNumber,
    reviewName: 'REVIEW!!!',
    standardId: 99_999,
    findingType: 'determination',
    findingSource: 'source',
    acro: 'AOC',
    severity: 3,
    reportDeliveryDate: '2025-02-22',
    monitoringFindingStatusName: 'Complete',
  });

  const citationTwo = await ActivityReportObjectiveCitation.create({
    activityReportObjectiveId: aroTwo.id,
    citationId: factCitation.id,
    citation: factCitation.citation,
    monitoringReferences: [flattenedReference],
    findingId,
    grantId: grant.id,
    grantNumber,
    reviewName: 'REVIEW!!!',
    standardId: 99_999,
    findingType: 'determination',
    findingSource: 'source',
    acro: 'AOC',
    severity: 3,
    reportDeliveryDate: '2025-02-22',
    monitoringFindingStatusName: 'Complete',
  });

  const findingHistory = await MonitoringFindingHistory.findOne({
    attributes: ['reviewId'],
    where: {
      findingId,
    },
    order: [['createdAt', 'DESC']],
  });

  const reviewId = findingHistory?.reviewId;

  if (reviewId) {
    const [deliveredReview] = await DeliveredReview.findOrCreate({
      where: {
        review_uuid: reviewId,
      },
      defaults: {
        mrid: Math.abs(parseInt(reviewId.replace(/\D/g, '').slice(0, 9), 10)) || Date.now(),
        review_uuid: reviewId,
        review_type: 'FA-1',
        review_status: 'Complete',
        report_delivery_date: '2025-02-22',
        complete: true,
        corrected: false,
      },
    });

    await DeliveredReviewCitation.findOrCreate({
      where: {
        citationId: factCitation.id,
        deliveredReviewId: deliveredReview.id,
      },
      defaults: {
        citationId: factCitation.id,
        deliveredReviewId: deliveredReview.id,
      },
    });

    await GrantDeliveredReview.findOrCreate({
      where: {
        grantId: grant.id,
        deliveredReviewId: deliveredReview.id,
      },
      defaults: {
        grantId: grant.id,
        deliveredReviewId: deliveredReview.id,
      },
    });
  }

  return {
    goal,
    objectives: [objectiveOne, objectiveTwo],
    reports: [reportOne, reportTwo],
    topic,
    citations: [citationOne, citationTwo],
  };
}

async function destroyReportAndCitationData(
  goal:{ id: number; grantId: number },
  objectives: { id: number }[],
  reports: { id: number }[],
  topic: { id: number },
  citations: { id: number; activityReportObjectiveId?: number }[],
) {
  const citationRowIds = citations.map((citation) => citation.id);

  const activityReportObjectiveIds = [...new Set(
    citations
      .map((citation) => citation.activityReportObjectiveId)
      .filter(
        (activityReportObjectiveId): activityReportObjectiveId is number => (
          !!activityReportObjectiveId
        ),
      ),
  )];

  let citationRowWhere: { activityReportObjectiveId: number[] } | { id: number[] } | null = null;
  if (activityReportObjectiveIds.length > 0) {
    citationRowWhere = { activityReportObjectiveId: activityReportObjectiveIds };
  } else if (citationRowIds.length > 0) {
    citationRowWhere = { id: citationRowIds };
  }

  const activityReportObjectiveCitationRows = citationRowWhere
    ? await ActivityReportObjectiveCitation.findAll({
      attributes: ['citationId'],
      where: citationRowWhere,
      raw: true,
    })
    : [];

  const normalizedCitationIds = [...new Set(
    activityReportObjectiveCitationRows
      .map((citationRow) => citationRow.citationId)
      .filter((citationId): citationId is number => Number.isInteger(citationId)),
  )];

  if (citationRowWhere) {
    await ActivityReportObjectiveCitation.destroy({
      where: citationRowWhere,
      force: true,
      individualHooks: true,
    });
  }

  if (normalizedCitationIds.length > 0) {
    const deliveredReviewLinks = await DeliveredReviewCitation.findAll({
      attributes: ['deliveredReviewId'],
      where: { citationId: normalizedCitationIds },
      raw: true,
    });

    const deliveredReviewIds = [...new Set(
      deliveredReviewLinks.map((link) => link.deliveredReviewId),
    )];

    await DeliveredReviewCitation.destroy({
      where: { citationId: normalizedCitationIds },
      force: true,
      individualHooks: true,
    });

    await GrantCitation.destroy({
      where: {
        grantId: goal.grantId,
        citationId: normalizedCitationIds,
      },
      force: true,
      individualHooks: true,
    });

    if (deliveredReviewIds.length > 0) {
      await GrantDeliveredReview.destroy({
        where: {
          grantId: goal.grantId,
          deliveredReviewId: deliveredReviewIds,
        },
        force: true,
        individualHooks: true,
      });

      await DeliveredReview.destroy({
        where: { id: deliveredReviewIds },
        force: true,
        individualHooks: true,
      });
    }

    await Citation.destroy({
      where: { id: normalizedCitationIds },
      force: true,
      individualHooks: true,
    });
  }

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
    where: { activityReportId: reports.map((r) => r.id) },
    force: true,
    individualHooks: true,
  });

  await ActivityReportObjective.destroy({
    where: { objectiveId: objectives.map((o) => o.id) },
    force: true,
    individualHooks: true,
  });

  await Promise.all(reports.map((report) => destroyReport(report)));

  await Objective.destroy({
    where: { id: objectives.map((o) => o.id) },
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
