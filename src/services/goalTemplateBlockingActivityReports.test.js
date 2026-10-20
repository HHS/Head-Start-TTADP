import { REPORT_STATUSES } from '@ttahub/common';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
import SCOPES from '../middleware/scopeConstants';
import db, {
  ActivityReportApprover,
  ActivityReportCollaborator,
  ActivityReportGoal,
  Goal,
  GoalTemplate,
  Grant,
  Permission,
  Recipient,
  Region,
  User,
} from '../models';
import {
  createRecipient,
  createRegion,
  createReport,
  createUser,
  destroyReport,
  getUniqueId,
} from '../testUtils';
import { getCuratedTemplates } from './goalTemplates';

describe('goal template blocking activity report enrichment', () => {
  const fixtureId = getUniqueId();
  let region;
  let otherRegion;
  let recipient;
  let grant;
  let otherGrant;
  let hiddenGoal;
  let hiddenGoalTemplate;
  let ordinaryGoal;
  let ordinaryGoalTemplate;
  let unusedGoalTemplate;
  let draftReport;
  let submittedReport;
  let needsActionReport;
  let approvedReport;
  let deletedReport;
  let creator;
  let collaborator;
  let approvingManager;
  let unrelatedAuthorizedUser;
  let unauthorizedUser;
  let reportOwner;

  const enrichedOptions = (userId) => ({
    includeBlockingActivityReports: true,
    includeClosedAndSuspendedGoals: true,
    userId,
  });

  const reportSummary = (report, href, creatorName) => ({
    creatorName,
    displayId: report.displayId,
    href,
  });

  const getBlockingReports = (template) =>
    typeof template.get === 'function'
      ? template.get('blockingActivityReports')
      : template.blockingActivityReports;

  const createTestGoalTemplate = (templateName) =>
    GoalTemplate.create(
      {
        creationMethod: CREATION_METHOD.CURATED,
        hash: `goal-blocker-${fixtureId}-${templateName}`,
        templateName: `(${templateName} ${fixtureId}) Test goal`,
        templateNameModifiedAt: new Date(),
      },
      { hooks: false }
    );

  const createTestGrant = (regionId) =>
    Grant.create(
      {
        endDate: new Date(),
        id: getUniqueId(),
        number: `TEST${getUniqueId()}`,
        recipientId: recipient.id,
        regionId,
        startDate: new Date('2021-01-01'),
        status: 'Active',
      },
      { hooks: false }
    );

  beforeAll(async () => {
    region = await createRegion({ name: 'Goal blocker test region' });
    otherRegion = await createRegion({ name: 'Goal blocker unauthorized region' });
    recipient = await createRecipient({ name: 'Goal blocker test recipient' });
    grant = await createTestGrant(region.id);
    otherGrant = await createTestGrant(otherRegion.id);
    creator = await createUser({ name: 'Hanna Fisher' });
    collaborator = await createUser({ name: 'Annika Lewis' });
    approvingManager = await createUser({ name: 'Morgan Manager' });
    unrelatedAuthorizedUser = await createUser({ name: 'Regional User' });
    unauthorizedUser = await createUser({ name: 'Different Region User' });
    reportOwner = await createUser({ name: 'Report Owner' });

    await Permission.bulkCreate([
      ...[creator, collaborator, approvingManager, unrelatedAuthorizedUser, reportOwner].map(
        (user) => ({
          regionId: grant.regionId,
          scopeId: SCOPES.READ_WRITE_REPORTS,
          userId: user.id,
        })
      ),
      {
        regionId: otherRegion.id,
        scopeId: SCOPES.READ_WRITE_REPORTS,
        userId: unauthorizedUser.id,
      },
    ]);
    hiddenGoalTemplate = await createTestGoalTemplate('Hidden activity report goal template');
    ordinaryGoalTemplate = await createTestGoalTemplate('Existing RTTAPA goal template');
    unusedGoalTemplate = await createTestGoalTemplate('Unused goal template');
    hiddenGoal = await Goal.create({
      createdVia: 'activityReport',
      goalTemplateId: hiddenGoalTemplate.id,
      grantId: grant.id,
      name: hiddenGoalTemplate.templateName,
      onApprovedAR: false,
      status: GOAL_STATUS.DRAFT,
    });
    ordinaryGoal = await Goal.create({
      createdVia: 'rtr',
      goalTemplateId: ordinaryGoalTemplate.id,
      grantId: grant.id,
      name: ordinaryGoalTemplate.templateName,
      onApprovedAR: false,
      status: GOAL_STATUS.IN_PROGRESS,
    });

    draftReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.DRAFT,
      creatorRole: 'Grants Specialist',
      regionId: grant.regionId,
      submissionStatus: REPORT_STATUSES.DRAFT,
      userId: creator.id,
    });
    submittedReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      creatorRole: 'Grants Specialist',
      regionId: grant.regionId,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      userId: reportOwner.id,
    });
    needsActionReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      creatorRole: 'Grants Specialist',
      regionId: grant.regionId,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      userId: reportOwner.id,
    });
    approvedReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.APPROVED,
      creatorRole: 'Grants Specialist',
      regionId: grant.regionId,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      userId: reportOwner.id,
    });
    deletedReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.DRAFT,
      creatorRole: 'Grants Specialist',
      regionId: grant.regionId,
      submissionStatus: REPORT_STATUSES.DRAFT,
      userId: reportOwner.id,
    });

    await ActivityReportCollaborator.create({
      activityReportId: submittedReport.id,
      userId: collaborator.id,
    });
    await ActivityReportApprover.create(
      {
        activityReportId: needsActionReport.id,
        status: null,
        userId: approvingManager.id,
      },
      { hooks: false }
    );

    await ActivityReportGoal.bulkCreate([
      { activityReportId: draftReport.id, goalId: hiddenGoal.id, status: hiddenGoal.status },
      { activityReportId: submittedReport.id, goalId: hiddenGoal.id, status: hiddenGoal.status },
      { activityReportId: submittedReport.id, goalId: hiddenGoal.id, status: hiddenGoal.status },
      { activityReportId: needsActionReport.id, goalId: hiddenGoal.id, status: hiddenGoal.status },
      { activityReportId: approvedReport.id, goalId: hiddenGoal.id, status: hiddenGoal.status },
      { activityReportId: deletedReport.id, goalId: hiddenGoal.id, status: hiddenGoal.status },
      { activityReportId: draftReport.id, goalId: ordinaryGoal.id, status: ordinaryGoal.status },
    ]);
    await deletedReport.update({ submissionStatus: REPORT_STATUSES.DELETED });
  });

  afterAll(async () => {
    try {
      if (deletedReport) {
        await deletedReport.update({ submissionStatus: REPORT_STATUSES.DRAFT });
      }
      const reports = [
        draftReport,
        submittedReport,
        needsActionReport,
        approvedReport,
        deletedReport,
      ].filter(Boolean);
      const reportIds = reports.map((report) => report.id);
      if (reportIds.length) {
        await ActivityReportApprover.destroy({
          where: { activityReportId: reportIds },
          force: true,
        });
        await ActivityReportCollaborator.destroy({
          where: { activityReportId: reportIds },
          force: true,
        });
        await ActivityReportGoal.destroy({ where: { activityReportId: reportIds }, force: true });
        for (const report of reports) {
          await destroyReport(report);
        }
      }

      const goalIds = [hiddenGoal, ordinaryGoal].filter(Boolean).map((goal) => goal.id);
      if (goalIds.length) {
        await Goal.destroy({ where: { id: goalIds }, force: true });
      }
      const templateIds = [hiddenGoalTemplate, ordinaryGoalTemplate, unusedGoalTemplate]
        .filter(Boolean)
        .map((template) => template.id);
      if (templateIds.length) {
        await GoalTemplate.destroy({ where: { id: templateIds }, force: true });
      }
      const users = [
        creator,
        collaborator,
        approvingManager,
        unrelatedAuthorizedUser,
        unauthorizedUser,
        reportOwner,
      ].filter(Boolean);
      const userIds = users.map((user) => user.id);
      if (userIds.length) {
        await Permission.destroy({ where: { userId: userIds } });
      }
      const grantIds = [grant, otherGrant].filter(Boolean).map((currentGrant) => currentGrant.id);
      if (grantIds.length) {
        await Grant.destroy({ hooks: false, where: { id: grantIds } });
      }
      if (userIds.length) {
        await User.destroy({ where: { id: userIds } });
      }
      if (recipient) {
        await Recipient.destroy({ where: { id: recipient.id }, force: true });
      }
      const regionIds = [region, otherRegion]
        .filter(Boolean)
        .map((currentRegion) => currentRegion.id);
      if (regionIds.length) {
        await Region.destroy({ where: { id: regionIds } });
      }
    } finally {
      await db.sequelize.close();
    }
  });

  const getTemplate = async (templateId, options) => {
    const templates = await getCuratedTemplates([grant.id], options);
    return templates.find((template) => template.id === templateId);
  };

  it('does not enrich responses when the flag is omitted', async () => {
    const template = await getTemplate(unusedGoalTemplate.id);

    expect(getBlockingReports(template)).toBeUndefined();
  });

  it('does not enrich responses when the flag is false', async () => {
    const template = await getTemplate(unusedGoalTemplate.id, {
      includeBlockingActivityReports: false,
      includeClosedAndSuspendedGoals: true,
      userId: creator.id,
    });

    expect(getBlockingReports(template)).toBeUndefined();
  });

  it('returns deduplicated Draft, Submitted, and Needs Action reports only', async () => {
    const template = await getTemplate(hiddenGoalTemplate.id, enrichedOptions(creator.id));
    expect(template).toBeDefined();
    const reports = getBlockingReports(template);

    expect(reports).toHaveLength(3);
    expect(reports).toEqual(
      expect.arrayContaining([
        reportSummary(draftReport, `/activity-reports/${draftReport.id}`, 'Hanna Fisher, GS'),
        reportSummary(submittedReport, null, 'Report Owner, GS'),
        reportSummary(needsActionReport, null, 'Report Owner, GS'),
      ])
    );
    expect(reports.map((report) => report.displayId)).not.toContain(approvedReport.displayId);
    expect(reports.map((report) => report.displayId)).not.toContain(deletedReport.displayId);
  });

  it('uses activity report access policy for collaborators and approving managers', async () => {
    const collaboratorTemplate = await getTemplate(
      hiddenGoalTemplate.id,
      enrichedOptions(collaborator.id)
    );
    const managerTemplate = await getTemplate(
      hiddenGoalTemplate.id,
      enrichedOptions(approvingManager.id)
    );

    expect(collaboratorTemplate).toBeDefined();
    expect(managerTemplate).toBeDefined();
    expect(getBlockingReports(collaboratorTemplate)).toContainEqual(
      reportSummary(submittedReport, `/activity-reports/${submittedReport.id}`, 'Report Owner, GS')
    );
    expect(getBlockingReports(managerTemplate)).toContainEqual(
      reportSummary(
        needsActionReport,
        `/activity-reports/${needsActionReport.id}`,
        'Report Owner, GS'
      )
    );
  });

  it('returns null links when the user may access the grant but not the reports', async () => {
    const template = await getTemplate(
      hiddenGoalTemplate.id,
      enrichedOptions(unrelatedAuthorizedUser.id)
    );

    expect(template).toBeDefined();
    expect(getBlockingReports(template)).toEqual(
      expect.arrayContaining([
        reportSummary(draftReport, null, 'Hanna Fisher, GS'),
        reportSummary(submittedReport, null, 'Report Owner, GS'),
        reportSummary(needsActionReport, null, 'Report Owner, GS'),
      ])
    );
  });

  it('does not enrich an ordinary RTTAPA goal attached to an unapproved report', async () => {
    const template = await getTemplate(
      ordinaryGoalTemplate.id,
      enrichedOptions(unrelatedAuthorizedUser.id)
    );

    expect(template).toBeUndefined();
  });

  it('rejects enrichment when the user has report access only in another region', async () => {
    await expect(
      getCuratedTemplates([grant.id], enrichedOptions(unauthorizedUser.id))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects enrichment when any requested grant is outside the user permissions', async () => {
    await expect(
      getCuratedTemplates([grant.id, otherGrant.id], enrichedOptions(unrelatedAuthorizedUser.id))
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
