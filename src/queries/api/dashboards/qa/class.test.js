import fs from 'node:fs';
import path from 'node:path';
import { QueryTypes } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../../../constants';
import db, {
  ActivityReportGoal,
  GoalTemplate,
  Grant,
  GrantNumberLink,
  MonitoringClassSummary,
  MonitoringGranteeLink,
  MonitoringReview,
  MonitoringReviewGrantee,
  MonitoringReviewLink,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  Program,
  Recipient,
} from '../../../../models';
import { setFilters } from '../../../../services/ssdi';
import { createGoal, createReport, destroyReport, getUniqueId } from '../../../../testUtils';

const CLASS_TEMPLATE_ID = 18172;

const sqlContent = (() => {
  const raw = fs.readFileSync(path.join(__dirname, 'class.sql'), 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//, '').trim();
})();

const runWithFilters = (filterValues) =>
  db.sequelize.transaction(async () => {
    await setFilters(filterValues);
    return db.sequelize.query(sqlContent, { type: QueryTypes.SELECT });
  });

const getDataset = (result, dataSet) => result.find((d) => d.data_set === dataSet);

const createApprovedGoalReport = async ({ grantId, goalId, regionId = 1, startDate }) => {
  const report = await createReport({
    activityRecipients: [{ grantId }],
    regionId,
    startDate,
    endDate: startDate,
  });

  const activityReportGoal = await ActivityReportGoal.create({
    activityReportId: report.id,
    goalId,
    isActivelyEdited: false,
  });

  return { report, activityReportGoal };
};

const destroyApprovedGoalReport = async ({ report, activityReportGoal }) => {
  if (activityReportGoal) {
    await activityReportGoal.destroy();
  }

  if (report) {
    await destroyReport(report);
  }
};

describe('class.sql dataset selection', () => {
  let recipient;
  let grant;
  let program;
  let goal;
  let reviewStatus;
  let review;
  let reviewGrantee;
  let classSummary;
  let activityReport;
  let activityReportGoal;

  beforeAll(async () => {
    await GoalTemplate.findOrCreate({
      where: { id: CLASS_TEMPLATE_ID },
      defaults: {
        id: CLASS_TEMPLATE_ID,
        hash: `qa-class-${CLASS_TEMPLATE_ID}`,
        templateName: 'QA CLASS Test Template',
        creationMethod: AUTOMATIC_CREATION,
        templateNameModifiedAt: new Date(),
      },
    });

    recipient = await Recipient.create({
      id: getUniqueId(),
      name: `QA CLASS Recipient ${getUniqueId()}`,
      uei: `QACLASS${getUniqueId(1000, 9999)}`,
    });

    grant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-${getUniqueId()}`,
        regionId: 1,
        recipientId: recipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    program = await Program.create({
      id: getUniqueId(),
      grantId: grant.id,
      programType: 'HS',
      status: 'Active',
    });

    goal = await createGoal({
      grantId: grant.id,
      goalTemplateId: CLASS_TEMPLATE_ID,
      status: 'In Progress',
      createdAt: new Date('2025-01-15'),
    });

    reviewStatus = await MonitoringReviewStatus.create({
      statusId: getUniqueId(200000, 299999),
      name: 'Complete',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    });

    review = await MonitoringReview.create({
      reviewId: `QA-CLASS-REVIEW-${getUniqueId()}`,
      contentId: `QA-CLASS-CONTENT-${getUniqueId()}`,
      statusId: reviewStatus.statusId,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-15'),
      reviewType: 'CLASS',
      reportDeliveryDate: new Date('2025-03-01'),
      reportAttachmentId: `QA-CLASS-ATTACHMENT-${getUniqueId()}`,
      outcome: 'Compliant',
      name: 'QA CLASS Review',
      hash: `qa-class-review-${getUniqueId()}`,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    });

    reviewGrantee = await MonitoringReviewGrantee.create({
      reviewId: review.reviewId,
      granteeId: `QA-CLASS-GRANTEE-${getUniqueId()}`,
      grantNumber: grant.number,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'qa-test',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    });

    classSummary = await MonitoringClassSummary.create({
      reviewId: review.reviewId,
      grantNumber: grant.number,
      emotionalSupport: 6.1,
      classroomOrganization: 5.9,
      instructionalSupport: 3.2,
      reportDeliveryDate: new Date('2025-03-01'),
      hash: `qa-class-summary-${getUniqueId()}`,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    });

    ({ report: activityReport, activityReportGoal } = await createApprovedGoalReport({
      grantId: grant.id,
      goalId: goal.id,
      regionId: 1,
      startDate: '2025-03-15T12:00:00Z',
    }));
  });

  afterAll(async () => {
    await destroyApprovedGoalReport({
      report: activityReport,
      activityReportGoal,
    });

    if (classSummary) {
      await MonitoringClassSummary.destroy({ where: { id: classSummary.id }, force: true });
    }
    if (reviewGrantee) {
      await MonitoringReviewGrantee.destroy({ where: { id: reviewGrantee.id }, force: true });
      await MonitoringGranteeLink.destroy({
        where: { granteeId: reviewGrantee.granteeId },
        force: true,
      });
    }
    if (review) {
      await MonitoringReview.destroy({ where: { id: review.id }, force: true });
      await MonitoringReviewLink.destroy({ where: { reviewId: review.reviewId }, force: true });
    }
    if (reviewStatus) {
      await MonitoringReviewStatus.destroy({ where: { id: reviewStatus.id }, force: true });
      await MonitoringReviewStatusLink.destroy({
        where: { statusId: reviewStatus.statusId },
        force: true,
      });
    }
    if (goal) {
      await db.Goal.destroy({ where: { id: goal.id }, force: true, individualHooks: true });
    }
    if (program) {
      await Program.destroy({ where: { id: program.id } });
    }
    if (grant) {
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: grant.number }, force: true });
    }
    if (recipient) {
      await Recipient.destroy({ where: { id: recipient.id } });
    }
  });

  it('returns only the widget dataset when only with_class_widget is requested', async () => {
    const result = await runWithFilters({
      region: [1],
      grantNumber: [grant.number],
      dataSetSelection: ['with_class_widget'],
    });

    expect(result.map((d) => d.data_set)).toEqual(['with_class_widget']);

    const widget = getDataset(result, 'with_class_widget');
    expect(widget.data[0]).toMatchObject({
      total: 1,
      'recipients with class': 1,
      '% recipients with class': 100.0,
      'grants with class': 1,
    });
  });

  it('returns page data when with_class_page is requested', async () => {
    const result = await runWithFilters({
      region: [1],
      grantNumber: [grant.number],
      dataSetSelection: ['with_class_page'],
    });

    expect(result.map((d) => d.data_set)).toEqual(['with_class_page']);

    const page = getDataset(result, 'with_class_page');
    expect(page.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientId: recipient.id,
          grantNumber: grant.number,
          reportDeliveryDate: expect.any(String),
          lastARStartDate: expect.any(String),
        }),
      ])
    );
  });

  it('returns page data with a blank last AR start date when the grant has a class goal and score but no AR', async () => {
    const noArRecipient = await Recipient.create({
      id: getUniqueId(),
      name: `QA No AR Recipient ${getUniqueId()}`,
      uei: `QANOAR${getUniqueId(1000, 9999)}`,
    });

    const noArGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-NOAR-${getUniqueId()}`,
        regionId: 1,
        recipientId: noArRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const noArProgram = await Program.create({
      id: getUniqueId(),
      grantId: noArGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    let noArGoal;
    let noArReview;
    let noArReviewGrantee;
    let noArClassSummary;

    try {
      noArGoal = await createGoal({
        grantId: noArGrant.id,
        goalTemplateId: CLASS_TEMPLATE_ID,
        status: 'In Progress',
        createdAt: new Date('2025-01-15'),
      });

      noArReview = await MonitoringReview.create({
        reviewId: `QA-NOAR-CLASS-REVIEW-${getUniqueId()}`,
        contentId: `QA-NOAR-CLASS-CONTENT-${getUniqueId()}`,
        statusId: reviewStatus.statusId,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-15'),
        reviewType: 'CLASS',
        reportDeliveryDate: new Date('2025-03-01'),
        reportAttachmentId: `QA-NOAR-CLASS-ATTACHMENT-${getUniqueId()}`,
        outcome: 'Compliant',
        name: 'QA No AR CLASS Review',
        hash: `qa-noar-class-review-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      noArReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: noArReview.reviewId,
        granteeId: `QA-NOAR-CLASS-GRANTEE-${getUniqueId()}`,
        grantNumber: noArGrant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      noArClassSummary = await MonitoringClassSummary.create({
        reviewId: noArReview.reviewId,
        grantNumber: noArGrant.number,
        emotionalSupport: 5.8,
        classroomOrganization: 5.4,
        instructionalSupport: 3.0,
        reportDeliveryDate: new Date('2025-03-01'),
        hash: `qa-noar-class-summary-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      const result = await runWithFilters({
        region: [1],
        grantNumber: [noArGrant.number],
        dataSetSelection: ['with_class_widget', 'with_class_page'],
      });

      const widget = getDataset(result, 'with_class_widget');
      expect(widget.data[0]).toMatchObject({
        total: 1,
        'recipients with class': 1,
        'grants with class': 1,
      });

      const page = getDataset(result, 'with_class_page');
      expect(page.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recipientId: noArRecipient.id,
            grantNumber: noArGrant.number,
            lastARStartDate: null,
            reportDeliveryDate: expect.any(String),
          }),
        ])
      );
    } finally {
      if (noArClassSummary) {
        await MonitoringClassSummary.destroy({ where: { id: noArClassSummary.id }, force: true });
      }
      if (noArReviewGrantee) {
        await MonitoringReviewGrantee.destroy({ where: { id: noArReviewGrantee.id }, force: true });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: noArReviewGrantee.granteeId },
          force: true,
        });
      }
      if (noArReview) {
        await MonitoringReview.destroy({ where: { id: noArReview.id }, force: true });
        await MonitoringReviewLink.destroy({
          where: { reviewId: noArReview.reviewId },
          force: true,
        });
      }
      if (noArGoal) {
        await db.Goal.destroy({ where: { id: noArGoal.id }, force: true, individualHooks: true });
      }
      await Program.destroy({ where: { id: noArProgram.id } });
      await Grant.destroy({ where: { id: noArGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: noArGrant.number }, force: true });
      await Recipient.destroy({ where: { id: noArRecipient.id } });
    }
  });

  it('does not count or return page data when class scores and the class goal are on different grants for the same recipient', async () => {
    const crossGrantRecipient = await Recipient.create({
      id: getUniqueId(),
      name: `QA Cross Grant Recipient ${getUniqueId()}`,
      uei: `QACROSS${getUniqueId(1000, 9999)}`,
    });

    const goalGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-GOAL-${getUniqueId()}`,
        regionId: 1,
        recipientId: crossGrantRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const scoreGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-SCORE-${getUniqueId()}`,
        regionId: 1,
        recipientId: crossGrantRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const goalGrantProgram = await Program.create({
      id: getUniqueId(),
      grantId: goalGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    const scoreGrantProgram = await Program.create({
      id: getUniqueId(),
      grantId: scoreGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    let goalGrantGoal;
    let scoreGrantGoal;
    let scoreGrantReview;
    let scoreGrantReviewGrantee;
    let scoreGrantClassSummary;
    let goalGrantReport;
    let goalGrantActivityReportGoal;

    try {
      goalGrantGoal = await createGoal({
        grantId: goalGrant.id,
        goalTemplateId: CLASS_TEMPLATE_ID,
        status: 'In Progress',
        createdAt: new Date('2025-01-15'),
      });

      scoreGrantGoal = await createGoal({
        grantId: scoreGrant.id,
        status: 'In Progress',
        createdAt: new Date('2025-01-20'),
      });

      ({ report: goalGrantReport, activityReportGoal: goalGrantActivityReportGoal } =
        await createApprovedGoalReport({
          grantId: goalGrant.id,
          goalId: goalGrantGoal.id,
          regionId: 1,
          startDate: '2025-04-15T12:00:00Z',
        }));

      scoreGrantReview = await MonitoringReview.create({
        reviewId: `QA-CROSS-CLASS-REVIEW-${getUniqueId()}`,
        contentId: `QA-CROSS-CLASS-CONTENT-${getUniqueId()}`,
        statusId: reviewStatus.statusId,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-15'),
        reviewType: 'CLASS',
        reportDeliveryDate: new Date('2025-04-01'),
        reportAttachmentId: `QA-CROSS-CLASS-ATTACHMENT-${getUniqueId()}`,
        outcome: 'Compliant',
        name: 'QA Cross Grant CLASS Review',
        hash: `qa-cross-class-review-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      scoreGrantReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: scoreGrantReview.reviewId,
        granteeId: `QA-CROSS-CLASS-GRANTEE-${getUniqueId()}`,
        grantNumber: scoreGrant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      scoreGrantClassSummary = await MonitoringClassSummary.create({
        reviewId: scoreGrantReview.reviewId,
        grantNumber: scoreGrant.number,
        emotionalSupport: 6.4,
        classroomOrganization: 6.0,
        instructionalSupport: 3.4,
        reportDeliveryDate: new Date('2025-04-01'),
        hash: `qa-cross-class-summary-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      const result = await runWithFilters({
        region: [1],
        grantNumber: [goalGrant.number, scoreGrant.number],
        dataSetSelection: ['with_class_widget', 'with_class_page'],
      });

      const widget = getDataset(result, 'with_class_widget');
      expect(widget.data[0]).toMatchObject({
        total: 1,
        'recipients with class': 0,
        'grants with class': 0,
      });

      const page = getDataset(result, 'with_class_page');
      expect(page.data).toEqual([]);
    } finally {
      await destroyApprovedGoalReport({
        report: goalGrantReport,
        activityReportGoal: goalGrantActivityReportGoal,
      });

      if (scoreGrantClassSummary) {
        await MonitoringClassSummary.destroy({
          where: { id: scoreGrantClassSummary.id },
          force: true,
        });
      }
      if (scoreGrantReviewGrantee) {
        await MonitoringReviewGrantee.destroy({
          where: { id: scoreGrantReviewGrantee.id },
          force: true,
        });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: scoreGrantReviewGrantee.granteeId },
          force: true,
        });
      }
      if (scoreGrantReview) {
        await MonitoringReview.destroy({ where: { id: scoreGrantReview.id }, force: true });
        await MonitoringReviewLink.destroy({
          where: { reviewId: scoreGrantReview.reviewId },
          force: true,
        });
      }
      if (scoreGrantGoal) {
        await db.Goal.destroy({
          where: { id: scoreGrantGoal.id },
          force: true,
          individualHooks: true,
        });
      }
      if (goalGrantGoal) {
        await db.Goal.destroy({
          where: { id: goalGrantGoal.id },
          force: true,
          individualHooks: true,
        });
      }
      await Program.destroy({ where: { id: scoreGrantProgram.id } });
      await Program.destroy({ where: { id: goalGrantProgram.id } });
      await Grant.destroy({ where: { id: scoreGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: scoreGrant.number }, force: true });
      await Grant.destroy({ where: { id: goalGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: goalGrant.number }, force: true });
      await Recipient.destroy({ where: { id: crossGrantRecipient.id } });
    }
  });

  it('does not use another grant summary when a single review spans multiple grants', async () => {
    const sharedReviewRecipient = await Recipient.create({
      id: getUniqueId(),
      name: `QA Shared Review Recipient ${getUniqueId()}`,
      uei: `QASHARED${getUniqueId(1000, 9999)}`,
    });

    const goalGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-SHARED-GOAL-${getUniqueId()}`,
        regionId: 1,
        recipientId: sharedReviewRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const otherGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-SHARED-OTHER-${getUniqueId()}`,
        regionId: 1,
        recipientId: sharedReviewRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const goalGrantProgram = await Program.create({
      id: getUniqueId(),
      grantId: goalGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    const otherGrantProgram = await Program.create({
      id: getUniqueId(),
      grantId: otherGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    let goalGrantGoal;
    let sharedReview;
    let goalGrantReviewGrantee;
    let otherGrantReviewGrantee;
    let goalGrantClassSummary;
    let otherGrantClassSummary;
    let goalGrantReport;
    let goalGrantActivityReportGoal;

    try {
      goalGrantGoal = await createGoal({
        grantId: goalGrant.id,
        goalTemplateId: CLASS_TEMPLATE_ID,
        status: 'In Progress',
        createdAt: new Date('2025-01-15'),
      });

      ({ report: goalGrantReport, activityReportGoal: goalGrantActivityReportGoal } =
        await createApprovedGoalReport({
          grantId: goalGrant.id,
          goalId: goalGrantGoal.id,
          regionId: 1,
          startDate: '2025-04-15T12:00:00Z',
        }));

      sharedReview = await MonitoringReview.create({
        reviewId: `QA-SHARED-CLASS-REVIEW-${getUniqueId()}`,
        contentId: `QA-SHARED-CLASS-CONTENT-${getUniqueId()}`,
        statusId: reviewStatus.statusId,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-15'),
        reviewType: 'CLASS',
        reportDeliveryDate: new Date('2025-04-01'),
        reportAttachmentId: `QA-SHARED-CLASS-ATTACHMENT-${getUniqueId()}`,
        outcome: 'Compliant',
        name: 'QA Shared Review CLASS Review',
        hash: `qa-shared-class-review-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      goalGrantReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: sharedReview.reviewId,
        granteeId: `QA-SHARED-CLASS-GOAL-GRANTEE-${getUniqueId()}`,
        grantNumber: goalGrant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      otherGrantReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: sharedReview.reviewId,
        granteeId: `QA-SHARED-CLASS-OTHER-GRANTEE-${getUniqueId()}`,
        grantNumber: otherGrant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      goalGrantClassSummary = await MonitoringClassSummary.create({
        reviewId: sharedReview.reviewId,
        grantNumber: goalGrant.number,
        emotionalSupport: null,
        classroomOrganization: 5.2,
        instructionalSupport: 2.4,
        reportDeliveryDate: new Date('2025-04-01'),
        hash: `qa-shared-class-summary-goal-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      otherGrantClassSummary = await MonitoringClassSummary.create({
        reviewId: sharedReview.reviewId,
        grantNumber: otherGrant.number,
        emotionalSupport: 6.5,
        classroomOrganization: 6.1,
        instructionalSupport: 3.6,
        reportDeliveryDate: new Date('2025-04-01'),
        hash: `qa-shared-class-summary-other-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      const result = await runWithFilters({
        region: [1],
        grantNumber: [goalGrant.number, otherGrant.number],
        dataSetSelection: ['with_class_widget', 'with_class_page'],
      });

      const widget = getDataset(result, 'with_class_widget');
      expect(widget.data[0]).toMatchObject({
        total: 1,
        'recipients with class': 0,
        'grants with class': 0,
      });

      const page = getDataset(result, 'with_class_page');
      expect(page.data).toEqual([]);
    } finally {
      await destroyApprovedGoalReport({
        report: goalGrantReport,
        activityReportGoal: goalGrantActivityReportGoal,
      });

      if (otherGrantClassSummary) {
        await MonitoringClassSummary.destroy({
          where: { id: otherGrantClassSummary.id },
          force: true,
        });
      }
      if (goalGrantClassSummary) {
        await MonitoringClassSummary.destroy({
          where: { id: goalGrantClassSummary.id },
          force: true,
        });
      }
      if (otherGrantReviewGrantee) {
        await MonitoringReviewGrantee.destroy({
          where: { id: otherGrantReviewGrantee.id },
          force: true,
        });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: otherGrantReviewGrantee.granteeId },
          force: true,
        });
      }
      if (goalGrantReviewGrantee) {
        await MonitoringReviewGrantee.destroy({
          where: { id: goalGrantReviewGrantee.id },
          force: true,
        });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: goalGrantReviewGrantee.granteeId },
          force: true,
        });
      }
      if (sharedReview) {
        await MonitoringReview.destroy({ where: { id: sharedReview.id }, force: true });
        await MonitoringReviewLink.destroy({
          where: { reviewId: sharedReview.reviewId },
          force: true,
        });
      }
      if (goalGrantGoal) {
        await db.Goal.destroy({
          where: { id: goalGrantGoal.id },
          force: true,
          individualHooks: true,
        });
      }
      await Program.destroy({ where: { id: otherGrantProgram.id } });
      await Program.destroy({ where: { id: goalGrantProgram.id } });
      await Grant.destroy({ where: { id: otherGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: otherGrant.number }, force: true });
      await Grant.destroy({ where: { id: goalGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: goalGrant.number }, force: true });
      await Recipient.destroy({ where: { id: sharedReviewRecipient.id } });
    }
  });

  it('counts a recipient once in the widget and returns one row per qualifying grant on the page', async () => {
    const multiGrantRecipient = await Recipient.create({
      id: getUniqueId(),
      name: `QA Multi Grant Recipient ${getUniqueId()}`,
      uei: `QAMULTI${getUniqueId(1000, 9999)}`,
    });

    const firstGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-MULTI-A-${getUniqueId()}`,
        regionId: 1,
        recipientId: multiGrantRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const secondGrant = await Grant.create(
      {
        id: getUniqueId(),
        number: `QACLASS-MULTI-B-${getUniqueId()}`,
        regionId: 1,
        recipientId: multiGrantRecipient.id,
        status: 'Active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
      },
      { individualHooks: true }
    );

    const firstProgram = await Program.create({
      id: getUniqueId(),
      grantId: firstGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    const secondProgram = await Program.create({
      id: getUniqueId(),
      grantId: secondGrant.id,
      programType: 'HS',
      status: 'Active',
    });

    let firstGoal;
    let secondGoal;
    let firstReview;
    let secondReview;
    let firstReviewGrantee;
    let secondReviewGrantee;
    let firstClassSummary;
    let secondClassSummary;

    try {
      firstGoal = await createGoal({
        grantId: firstGrant.id,
        goalTemplateId: CLASS_TEMPLATE_ID,
        status: 'In Progress',
        createdAt: new Date('2025-01-15'),
      });

      secondGoal = await createGoal({
        grantId: secondGrant.id,
        goalTemplateId: CLASS_TEMPLATE_ID,
        status: 'In Progress',
        createdAt: new Date('2025-01-20'),
      });

      firstReview = await MonitoringReview.create({
        reviewId: `QA-MULTI-CLASS-REVIEW-A-${getUniqueId()}`,
        contentId: `QA-MULTI-CLASS-CONTENT-A-${getUniqueId()}`,
        statusId: reviewStatus.statusId,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-15'),
        reviewType: 'CLASS',
        reportDeliveryDate: new Date('2025-03-01'),
        reportAttachmentId: `QA-MULTI-CLASS-ATTACHMENT-A-${getUniqueId()}`,
        outcome: 'Compliant',
        name: 'QA Multi Grant CLASS Review A',
        hash: `qa-multi-class-review-a-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      secondReview = await MonitoringReview.create({
        reviewId: `QA-MULTI-CLASS-REVIEW-B-${getUniqueId()}`,
        contentId: `QA-MULTI-CLASS-CONTENT-B-${getUniqueId()}`,
        statusId: reviewStatus.statusId,
        startDate: new Date('2025-02-05'),
        endDate: new Date('2025-02-20'),
        reviewType: 'CLASS',
        reportDeliveryDate: new Date('2025-03-10'),
        reportAttachmentId: `QA-MULTI-CLASS-ATTACHMENT-B-${getUniqueId()}`,
        outcome: 'Compliant',
        name: 'QA Multi Grant CLASS Review B',
        hash: `qa-multi-class-review-b-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      firstReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: firstReview.reviewId,
        granteeId: `QA-MULTI-CLASS-GRANTEE-A-${getUniqueId()}`,
        grantNumber: firstGrant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      secondReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: secondReview.reviewId,
        granteeId: `QA-MULTI-CLASS-GRANTEE-B-${getUniqueId()}`,
        grantNumber: secondGrant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      firstClassSummary = await MonitoringClassSummary.create({
        reviewId: firstReview.reviewId,
        grantNumber: firstGrant.number,
        emotionalSupport: 6.0,
        classroomOrganization: 5.7,
        instructionalSupport: 3.1,
        reportDeliveryDate: new Date('2025-03-01'),
        hash: `qa-multi-class-summary-a-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      secondClassSummary = await MonitoringClassSummary.create({
        reviewId: secondReview.reviewId,
        grantNumber: secondGrant.number,
        emotionalSupport: 6.2,
        classroomOrganization: 5.8,
        instructionalSupport: 3.3,
        reportDeliveryDate: new Date('2025-03-10'),
        hash: `qa-multi-class-summary-b-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      const result = await runWithFilters({
        region: [1],
        grantNumber: [firstGrant.number, secondGrant.number],
        dataSetSelection: ['with_class_widget', 'with_class_page'],
      });

      const widget = getDataset(result, 'with_class_widget');
      expect(widget.data[0]).toMatchObject({
        total: 1,
        'recipients with class': 1,
        'grants with class': 2,
      });

      const page = getDataset(result, 'with_class_page');
      expect(page.data).toHaveLength(2);
      expect(page.data.map((entry) => entry.grantNumber).sort()).toEqual(
        [firstGrant.number, secondGrant.number].sort()
      );
    } finally {
      if (secondClassSummary) {
        await MonitoringClassSummary.destroy({ where: { id: secondClassSummary.id }, force: true });
      }
      if (firstClassSummary) {
        await MonitoringClassSummary.destroy({ where: { id: firstClassSummary.id }, force: true });
      }
      if (secondReviewGrantee) {
        await MonitoringReviewGrantee.destroy({
          where: { id: secondReviewGrantee.id },
          force: true,
        });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: secondReviewGrantee.granteeId },
          force: true,
        });
      }
      if (firstReviewGrantee) {
        await MonitoringReviewGrantee.destroy({
          where: { id: firstReviewGrantee.id },
          force: true,
        });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: firstReviewGrantee.granteeId },
          force: true,
        });
      }
      if (secondReview) {
        await MonitoringReview.destroy({ where: { id: secondReview.id }, force: true });
        await MonitoringReviewLink.destroy({
          where: { reviewId: secondReview.reviewId },
          force: true,
        });
      }
      if (firstReview) {
        await MonitoringReview.destroy({ where: { id: firstReview.id }, force: true });
        await MonitoringReviewLink.destroy({
          where: { reviewId: firstReview.reviewId },
          force: true,
        });
      }
      if (secondGoal) {
        await db.Goal.destroy({ where: { id: secondGoal.id }, force: true, individualHooks: true });
      }
      if (firstGoal) {
        await db.Goal.destroy({ where: { id: firstGoal.id }, force: true, individualHooks: true });
      }
      await Program.destroy({ where: { id: secondProgram.id } });
      await Program.destroy({ where: { id: firstProgram.id } });
      await Grant.destroy({ where: { id: secondGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: secondGrant.number }, force: true });
      await Grant.destroy({ where: { id: firstGrant.id }, individualHooks: true });
      await GrantNumberLink.destroy({ where: { grantNumber: firstGrant.number }, force: true });
      await Recipient.destroy({ where: { id: multiGrantRecipient.id } });
    }
  });

  it('uses the most recent class score for the same grant even when the later score is after the last approved activity start date', async () => {
    let laterReview;
    let laterReviewGrantee;
    let laterClassSummary;

    try {
      laterReview = await MonitoringReview.create({
        reviewId: `QA-CLASS-LATER-REVIEW-${getUniqueId()}`,
        contentId: `QA-CLASS-LATER-CONTENT-${getUniqueId()}`,
        statusId: reviewStatus.statusId,
        startDate: new Date('2025-04-20'),
        endDate: new Date('2025-04-25'),
        reviewType: 'CLASS',
        reportDeliveryDate: new Date('2025-05-01'),
        reportAttachmentId: `QA-CLASS-LATER-ATTACHMENT-${getUniqueId()}`,
        outcome: 'Compliant',
        name: 'QA CLASS Later Review',
        hash: `qa-class-later-review-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      laterReviewGrantee = await MonitoringReviewGrantee.create({
        reviewId: laterReview.reviewId,
        granteeId: `QA-CLASS-LATER-GRANTEE-${getUniqueId()}`,
        grantNumber: grant.number,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'qa-test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      laterClassSummary = await MonitoringClassSummary.create({
        reviewId: laterReview.reviewId,
        grantNumber: grant.number,
        emotionalSupport: 7.1,
        classroomOrganization: 6.9,
        instructionalSupport: 4.2,
        reportDeliveryDate: new Date('2025-05-01'),
        hash: `qa-class-later-summary-${getUniqueId()}`,
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      });

      const result = await runWithFilters({
        region: [1],
        grantNumber: [grant.number],
        dataSetSelection: ['with_class_page'],
      });

      const page = getDataset(result, 'with_class_page');
      const row = page.data.find((entry) => entry.goalId === goal.id);

      expect(new Date(row.reportDeliveryDate).toISOString().slice(0, 10)).toBe('2025-05-01');
      expect(row.emotionalSupport).toBe(7.1);
      expect(row.classroomOrganization).toBe(6.9);
      expect(row.instructionalSupport).toBe(4.2);
    } finally {
      if (laterClassSummary) {
        await MonitoringClassSummary.destroy({ where: { id: laterClassSummary.id }, force: true });
      }
      if (laterReviewGrantee) {
        await MonitoringReviewGrantee.destroy({
          where: { id: laterReviewGrantee.id },
          force: true,
        });
        await MonitoringGranteeLink.destroy({
          where: { granteeId: laterReviewGrantee.granteeId },
          force: true,
        });
      }
      if (laterReview) {
        await MonitoringReview.destroy({ where: { id: laterReview.id }, force: true });
        await MonitoringReviewLink.destroy({
          where: { reviewId: laterReview.reviewId },
          force: true,
        });
      }
    }
  });
});
