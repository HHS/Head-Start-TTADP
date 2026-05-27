import faker from '@faker-js/faker';
import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import {
  ActivityRecipient,
  ActivityReport,
  ActivityReportGoal,
  EventReportPilot,
  Goal,
  GoalTemplate,
  Grant,
  Recipient,
  sequelize,
  SessionReportPilot,
  SessionReportPilotGoalTemplate,
  User,
} from '../models';
import filtersToScopes from '../scopes';
import approvedARAndTRByGoalCategory, {
  mergeGoalCategoryCounts,
} from './approvedARAndTRByGoalCategory';

// ─── Shared mock user ────────────────────────────────────────────────────────

const mockUser = {
  homeRegionId: 1,
  name: faker.name.findName(),
  hsesUsername: faker.internet.email(),
  hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
  lastLogin: new Date(),
};

// ─── Unit: mergeGoalCategoryCounts ──────────────────────────────────────────

describe('mergeGoalCategoryCounts', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeGoalCategoryCounts([], [])).toEqual([]);
  });

  it('returns AR-only categories with sessionReportCount: 0', () => {
    const result = mergeGoalCategoryCounts(
      [{ standard: 'ERSEA', count: '3' }],
      [],
    );
    expect(result).toEqual([{ category: 'ERSEA', activityReportCount: 3, sessionReportCount: 0 }]);
  });

  it('returns TR-only categories with activityReportCount: 0', () => {
    const result = mergeGoalCategoryCounts(
      [],
      [{ standard: 'Teaching Practices', count: '2' }],
    );
    expect(result).toEqual([
      { category: 'Teaching Practices', activityReportCount: 0, sessionReportCount: 2 },
    ]);
  });

  it('merges matching categories from both sides', () => {
    const result = mergeGoalCategoryCounts(
      [{ standard: 'ERSEA', count: '4' }],
      [{ standard: 'ERSEA', count: '1' }],
    );
    expect(result).toEqual([{ category: 'ERSEA', activityReportCount: 4, sessionReportCount: 1 }]);
  });

  it('sorts results alphabetically by category', () => {
    const result = mergeGoalCategoryCounts(
      [
        { standard: 'Teaching Practices', count: '1' },
        { standard: 'ERSEA', count: '2' },
      ],
      [],
    );
    expect(result.map((r) => r.category)).toEqual(['ERSEA', 'Teaching Practices']);
  });
});

// ─── Integration: approvedARAndTRByGoalCategory ──────────────────────────────

describe('approvedARAndTRByGoalCategory', () => {
  let user;
  let recipient;

  // Grants: we need separate grants because there is a unique index on
  // (grantId, goalTemplateId) for non-closed goals.
  let grant; // main grant — holds goalApproved1 (ERSEA) and goalApproved2 (Family Engagement)
  let grant2; // secondary grant — holds goalOld (ERSEA, backdated) and goalUnapprovedAR (Child Safety)

  // Goal templates (existing from migrations)
  let templateERSEA; // AR-only category in our test data
  let templateTeachingPractices; // TR-only category
  let templateFamilyEngagement; // Both AR and TR
  let templateChildSafety; // Used only by goalUnapprovedAR (to test unapproved exclusion)

  // Activity reports
  let approvedReport;
  let unapprovedReport;

  // Activity recipients
  let arRecipient1;
  let arRecipient2;
  let arRecipientUnapproved;

  // AR-side goals
  let goalApproved1; // grant/ERSEA on approved AR — post-cutoff
  let goalApproved2; // grant/FamilyEngagement on approved AR — post-cutoff
  let goalUnapprovedAR; // grant2/ChildSafety on unapproved AR — should NOT count
  let goalOld; // grant2/ERSEA on approved AR — createdAt backdated, should NOT count

  // TR-side test data
  let event;
  let sessionComplete;
  let sessionIncomplete;
  let eventOld;
  let sessionOld;

  // Junctions
  let junctionCompleteTP; // sessionComplete → Teaching Practices (post-cutoff)
  let junctionCompleteFE; // sessionComplete → Family Engagement (post-cutoff)
  let junctionIncomplete; // sessionIncomplete → Teaching Practices (should not count)
  let junctionOld; // sessionOld → Teaching Practices, backdated (should not count)

  const makeGrant = (recipientId, regionId = 1) =>
    Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 20000, max: 40000 })),
      number: faker.datatype.string(8),
      regionId,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId,
    });

  beforeAll(async () => {
    user = await User.create(mockUser);

    recipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 20000, max: 40000 })),
      name: faker.company.companyName(),
      uei: faker.datatype.string(12).toUpperCase(),
    });

    grant = await makeGrant(recipient.id, 1);
    grant2 = await makeGrant(recipient.id, 1);

    // Load existing curated goal templates from migrations
    templateERSEA = await GoalTemplate.findOne({ where: { standard: 'ERSEA' } });
    templateTeachingPractices = await GoalTemplate.findOne({
      where: { standard: 'Teaching Practices' },
    });
    templateFamilyEngagement = await GoalTemplate.findOne({
      where: { standard: 'Family Engagement' },
    });
    templateChildSafety = await GoalTemplate.findOne({ where: { standard: 'Child Safety' } });

    if (
      !templateERSEA ||
      !templateTeachingPractices ||
      !templateFamilyEngagement ||
      !templateChildSafety
    ) {
      throw new Error(
        'Required curated GoalTemplates (ERSEA, Teaching Practices, Family Engagement, ' +
          'Child Safety) not found — run migrations first.',
      );
    }

    // ── Activity Reports ──────────────────────────────────────────────────────

    approvedReport = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: user.id,
      regionId: 1,
      numberOfParticipants: 5,
      deliveryMethod: 'Virtual',
      duration: 1,
      startDate: new Date(),
      endDate: new Date(),
      version: 2,
    });

    unapprovedReport = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED, // not approved
      userId: user.id,
      regionId: 1,
      numberOfParticipants: 5,
      deliveryMethod: 'Virtual',
      duration: 1,
      startDate: new Date(),
      endDate: new Date(),
      version: 2,
    });

    arRecipient1 = await ActivityRecipient.create({
      activityReportId: approvedReport.id,
      grantId: grant.id,
    });

    arRecipient2 = await ActivityRecipient.create({
      activityReportId: approvedReport.id,
      grantId: grant2.id,
    });

    arRecipientUnapproved = await ActivityRecipient.create({
      activityReportId: unapprovedReport.id,
      grantId: grant2.id,
    });

    // ── AR-side goals ─────────────────────────────────────────────────────────

    // ERSEA on grant1, approved AR, createdAt = now (after cutoff) — SHOULD count
    goalApproved1 = await Goal.create(
      {
        name: 'Approved AR Goal - ERSEA',
        grantId: grant.id,
        goalTemplateId: templateERSEA.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: 1,
        prestandard: false,
      },
      { hooks: false },
    );

    // Family Engagement on grant1, approved AR, createdAt = now — SHOULD count
    goalApproved2 = await Goal.create(
      {
        name: 'Approved AR Goal - Family Engagement',
        grantId: grant.id,
        goalTemplateId: templateFamilyEngagement.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: 2,
        prestandard: false,
      },
      { hooks: false },
    );

    // Child Safety on grant2, unapproved AR — should NOT count
    goalUnapprovedAR = await Goal.create(
      {
        name: 'Unapproved AR Goal - Child Safety',
        grantId: grant2.id,
        goalTemplateId: templateChildSafety.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: false,
        rtrOrder: 3,
        prestandard: false,
      },
      { hooks: false },
    );

    // ERSEA on grant2, approved AR — but createdAt will be backdated, should NOT count
    goalOld = await Goal.create(
      {
        name: 'Old Goal - ERSEA',
        grantId: grant2.id,
        goalTemplateId: templateERSEA.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: 4,
        prestandard: false,
      },
      { hooks: false },
    );

    // Backdate goalOld to before the cutoff
    await sequelize.query(
      `UPDATE "Goals" SET "createdAt" = '2025-08-15' WHERE id = ${goalOld.id}`,
    );

    await ActivityReportGoal.create({ activityReportId: approvedReport.id, goalId: goalApproved1.id });
    await ActivityReportGoal.create({ activityReportId: approvedReport.id, goalId: goalApproved2.id });
    await ActivityReportGoal.create({
      activityReportId: unapprovedReport.id,
      goalId: goalUnapprovedAR.id,
    });
    await ActivityReportGoal.create({ activityReportId: approvedReport.id, goalId: goalOld.id });

    // ── TR side ───────────────────────────────────────────────────────────────

    event = await EventReportPilot.create({
      ownerId: user.id,
      regionId: 1,
      pocIds: [user.id],
      collaboratorIds: [user.id],
      data: {
        eventId: `R01-TR-${faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }))}`,
        startDate: '10/01/2025',
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    sessionComplete = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE },
    });

    sessionIncomplete = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS },
    });

    // Teaching Practices on complete session, post-cutoff junction — SHOULD count
    junctionCompleteTP = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionComplete.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    // Family Engagement on complete session, post-cutoff junction — SHOULD count
    junctionCompleteFE = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionComplete.id,
      goalTemplateId: templateFamilyEngagement.id,
    });

    // Teaching Practices on incomplete session — should NOT count
    junctionIncomplete = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionIncomplete.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    // Separate event/session to test old junction cutoff
    eventOld = await EventReportPilot.create({
      ownerId: user.id,
      regionId: 1,
      pocIds: [user.id],
      collaboratorIds: [user.id],
      data: {
        eventId: `R01-TR-${faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }))}`,
        startDate: '10/01/2025',
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    sessionOld = await SessionReportPilot.create({
      eventId: eventOld.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE },
    });

    // Teaching Practices junction but createdAt before cutoff — should NOT count
    junctionOld = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionOld.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    // Backdate the old junction
    await sequelize.query(
      `UPDATE "SessionReportPilotGoalTemplates" SET "createdAt" = '2025-08-15' WHERE id = ${junctionOld.id}`,
    );
  });

  afterAll(async () => {
    // AR side (reverse dependency order)
    await ActivityReportGoal.destroy({
      where: {
        goalId: [goalApproved1.id, goalApproved2.id, goalUnapprovedAR.id, goalOld.id],
      },
      force: true,
    });

    await Goal.destroy({
      where: { id: [goalApproved1.id, goalApproved2.id, goalUnapprovedAR.id, goalOld.id] },
      force: true,
    });

    await ActivityRecipient.destroy({
      where: { id: [arRecipient1.id, arRecipient2.id, arRecipientUnapproved.id] },
      force: true,
    });

    await ActivityReport.destroy({
      where: { id: [approvedReport.id, unapprovedReport.id] },
      force: true,
    });

    // TR side
    await SessionReportPilotGoalTemplate.destroy({
      where: {
        id: [junctionCompleteTP.id, junctionCompleteFE.id, junctionIncomplete.id, junctionOld.id],
      },
    });

    await SessionReportPilot.destroy({
      where: { id: [sessionComplete.id, sessionIncomplete.id, sessionOld.id] },
      force: true,
    });

    await EventReportPilot.destroy({
      where: { id: [event.id, eventOld.id] },
      force: true,
    });

    // Shared
    await Grant.destroy({ where: { id: [grant.id, grant2.id] }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await User.destroy({ where: { id: user.id } });
  });

  it('returns activityReportCount and sessionReportCount for each category', async () => {
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    expect(Array.isArray(results)).toBe(true);
    results.forEach((row) => {
      expect(row).toHaveProperty('category');
      expect(row).toHaveProperty('activityReportCount');
      expect(row).toHaveProperty('sessionReportCount');
      expect(typeof row.activityReportCount).toBe('number');
      expect(typeof row.sessionReportCount).toBe('number');
    });
  });

  it('only counts approved ARs (calculatedStatus = approved)', async () => {
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    // Child Safety is only linked to the unapproved AR — it must not appear at all
    const childSafetyRow = results.find((r) => r.category === templateChildSafety.standard);
    // If it does appear (from other data in the shared DB), its count from our test must be 0.
    // Since Child Safety only appears on the unapproved AR in this test, it must not be counted.
    if (childSafetyRow) {
      // The unapproved AR should not inflate the count beyond any pre-existing data
      expect(childSafetyRow.activityReportCount).toBe(0);
    }
  });

  it('excludes goals with createdAt before 2025-09-01 from AR counts', async () => {
    // goalOld uses ERSEA on grant2 with createdAt = 2025-08-15 (before cutoff).
    // goalApproved1 uses ERSEA on grant1 with createdAt = now (after cutoff).
    // ERSEA AR count should be exactly 1 (only goalApproved1 qualifies).
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const erseaRow = results.find((r) => r.category === templateERSEA.standard);
    expect(erseaRow).toBeDefined();
    expect(erseaRow.activityReportCount).toBe(1);
  });

  it('only counts complete session reports (data.status = complete)', async () => {
    // Teaching Practices has junctionCompleteTP (complete session) and
    // junctionIncomplete (in-progress session). Only the complete one should count.
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.sessionReportCount).toBe(1);
  });

  it('excludes SessionReportPilotGoalTemplate rows with createdAt before 2025-09-01', async () => {
    // Teaching Practices has junctionCompleteTP (current) and junctionOld (backdated).
    // Only junctionCompleteTP should contribute to the count.
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.sessionReportCount).toBe(1);
  });

  it('returns 0 sessionReportCount for AR-only categories', async () => {
    // ERSEA appears on approved ARs but has no complete session reports in our test data.
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const erseaRow = results.find((r) => r.category === templateERSEA.standard);
    expect(erseaRow).toBeDefined();
    expect(erseaRow.sessionReportCount).toBe(0);
  });

  it('returns 0 activityReportCount for TR-only categories', async () => {
    // Teaching Practices appears on complete TRs but has no goals on approved ARs in our test data.
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.activityReportCount).toBe(0);
  });

  it('populates both counts for categories present on AR and TR sides', async () => {
    // Family Engagement is used by goalApproved2 (approved AR) and junctionCompleteFE (complete TR).
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const feRow = results.find((r) => r.category === templateFamilyEngagement.standard);
    expect(feRow).toBeDefined();
    expect(feRow.activityReportCount).toBe(1);
    expect(feRow.sessionReportCount).toBe(1);
  });

  it('excludes Monitoring standard from results', async () => {
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const monitoringRow = results.find((r) => r.category === 'Monitoring');
    expect(monitoringRow).toBeUndefined();
  });

  it('results are sorted alphabetically by category', async () => {
    const scopes = await filtersToScopes({ 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const categories = results.map((r) => r.category);
    const sorted = [...categories].sort((a, b) => a.localeCompare(b));
    expect(categories).toEqual(sorted);
  });

  it('returns empty array when no AR or TR data matches scopes', async () => {
    // A region number that has no test data
    const scopes = await filtersToScopes({ 'region.in': ['999'] });
    const results = await approvedARAndTRByGoalCategory(scopes);
    expect(results).toEqual([]);
  });
});
