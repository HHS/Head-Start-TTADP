import fs from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db, {
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
import { AUTOMATIC_CREATION } from '../../../../constants';
import {
  createGoal,
  getUniqueId,
} from '../../../../testUtils';
import { setFilters } from '../../../../services/ssdi';

const CLASS_TEMPLATE_ID = 18172;

const sqlContent = (() => {
  const raw = fs.readFileSync(path.join(__dirname, 'class.sql'), 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//, '').trim();
})();

const runWithFilters = (filterValues) => db.sequelize.transaction(async () => {
  await setFilters(filterValues);
  return db.sequelize.query(sqlContent, { type: QueryTypes.SELECT });
});

const getDataset = (result, dataSet) => result.find((d) => d.data_set === dataSet);

describe('class.sql dataset selection', () => {
  let recipient;
  let grant;
  let program;
  let goal;
  let reviewStatus;
  let review;
  let reviewGrantee;
  let classSummary;

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

    grant = await Grant.create({
      id: getUniqueId(),
      number: `QACLASS-${getUniqueId()}`,
      regionId: 1,
      recipientId: recipient.id,
      status: 'Active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
    }, { individualHooks: true });

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
      emotionalSupport: 6.1000,
      classroomOrganization: 5.9000,
      instructionalSupport: 3.2000,
      reportDeliveryDate: new Date('2025-03-01'),
      hash: `qa-class-summary-${getUniqueId()}`,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    });
  });

  afterAll(async () => {
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
      '% recipients with class': 100.00,
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
        }),
      ]),
    );
  });
});
