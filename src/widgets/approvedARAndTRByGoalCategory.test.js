import faker from '@faker-js/faker';
import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { CREATION_METHOD } from '../constants';
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
    expect(result).toEqual([{ category: 'ERSEA', activityReportCount: 3, sessionReportCount: 0, total: 3 }]);
  });

  it('returns TR-only categories with activityReportCount: 0', () => {
    const result = mergeGoalCategoryCounts(
      [],
      [{ standard: 'Teaching Practices', count: '2' }],
    );
    expect(result).toEqual([
      { category: 'Teaching Practices', activityReportCount: 0, sessionReportCount: 2, total: 2 },
    ]);
  });

  it('merges matching categories from both sides', () => {
    const result = mergeGoalCategoryCounts(
      [{ standard: 'ERSEA', count: '4' }],
      [{ standard: 'ERSEA', count: '1' }],
    );
    expect(result).toEqual([{ category: 'ERSEA', activityReportCount: 4, sessionReportCount: 1, total: 5 }]);
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

  // Grants: we need separate grants because there is a unique partial index on
  // (grantId, goalTemplateId) for non-closed goals.
  //   grant  — ERSEA, FamilyEngagement, TeachingPractices (for TR), and test-template goals
  //   grant2 — ERSEA (old/backdated), ChildSafety (unapproved AR), TeachingPractices (prestandard)
  let grant;
  let grant2;

  // ── Goal templates (loaded from migrations) ──────────────────────────────
  let templateERSEA; // AR-only in our test data
  let templateTeachingPractices; // TR-only in our test data
  let templateFamilyEngagement; // Both AR and TR
  let templateChildSafety; // Unapproved-AR-only → AR count always 0

  // ── Test-only template for TR date filter isolation ──────────────────────
  // Only has a backdated Goal → should never appear in TR results.
  let templateForOldTRTest;

  // ── Activity reports ──────────────────────────────────────────────────────
  let approvedReport;
  let approvedReportOld; // pre-cutoff startDate — used to test AR startDate exclusion
  let unapprovedReport;

  // AR recipients
  let arRecipient1; // approvedReport → grant
  let arRecipient2; // approvedReport → grant2
  let arRecipientUnapproved; // unapprovedReport → grant2
  let arRecipientOld; // approvedReportOld → grant2

  // ── AR-side goals ─────────────────────────────────────────────────────────
  let goalApproved1; // grant / ERSEA           / post-cutoff / approved AR  ✓
  let goalApproved2; // grant / FamilyEngagement / post-cutoff / approved AR  ✓
  let goalUnapprovedAR; // grant2 / ChildSafety / post-cutoff / unapproved AR ✗
  let goalOld; // grant2 / ERSEA / on approvedReportOld (pre-cutoff startDate) ✗
  let goalForTP; // grant / TeachingPractices / post-cutoff / NO AR link (enables TR counting)
  let goalPrestandard; // grant2 / TeachingPractices / post-cutoff / approved AR / prestandard=true ✗
  let goalForOldTRTest; // grant / templateForOldTRTest / enables template; session has pre-cutoff startDate ✗

  // AR goal links
  let argApproved1;
  let argApproved2;
  let argOld;
  let argUnapproved;
  let argPrestandard;

  // ── TR-side data ──────────────────────────────────────────────────────────
  // main event: two complete sessions + one incomplete
  let event;
  let sessionComplete; // complete — has TP + FE junctions
  let sessionComplete2; // complete — also has TP (same event, for double-counting test)
  let sessionIncomplete; // in-progress — should not count

  // separate event for the TR date-filter test
  let eventForOldTRTest;
  let sessionForOldTRTest; // complete, but template only has backdated Goal

  // Junctions (GoalTemplate)
  let junctionCompleteTP; // sessionComplete       → TeachingPractices
  let junctionCompleteFE; // sessionComplete       → FamilyEngagement
  let junctionCompleteTP2; // sessionComplete2     → TeachingPractices (double-count)
  let junctionIncomplete; // sessionIncomplete     → TeachingPractices (excluded)

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

    // ── Load templates from migrations ────────────────────────────────────────
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

    // ── Create a test-only GoalTemplate for the TR date filter test ───────────
    // The templateName pattern "(Standard) ..." causes Postgres to auto-generate
    // standard = 'Standard', giving us a clean isolated category.
    const uniqueSuffix = faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }));
    templateForOldTRTest = await GoalTemplate.create({
      templateName: `(TR Date Test ${uniqueSuffix}) Isolation Template`,
      creationMethod: CREATION_METHOD.CURATED,
    });

    // ── Activity reports ──────────────────────────────────────────────────────
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

    approvedReportOld = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: user.id,
      regionId: 1,
      numberOfParticipants: 5,
      deliveryMethod: 'Virtual',
      duration: 1,
      startDate: new Date('2025-08-15'),
      endDate: new Date('2025-08-15'),
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

    arRecipientOld = await ActivityRecipient.create({
      activityReportId: approvedReportOld.id,
      grantId: grant2.id,
    });

    // ── AR-side goals ─────────────────────────────────────────────────────────

    // ERSEA on grant, approved AR, post-cutoff — SHOULD be counted (AR:1)
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

    // Family Engagement on grant, approved AR, post-cutoff — SHOULD count (AR:1, TR:1)
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

    // Child Safety on grant2, unapproved AR, post-cutoff — should NOT count (wrong status)
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

    // ERSEA on grant2, on approvedReportOld (pre-cutoff startDate) — should NOT count
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

    // Teaching Practices on grant, NOT on any AR.
    // Its existence provides the qualifying non-prestandard goal for the TR side.
    goalForTP = await Goal.create(
      {
        name: 'TR Date Enabler - Teaching Practices',
        grantId: grant.id,
        goalTemplateId: templateTeachingPractices.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: false,
        onApprovedAR: false,
        rtrOrder: 5,
        prestandard: false,
      },
      { hooks: false },
    );

    // Teaching Practices on grant2, approved AR, post-cutoff, prestandard=true.
    // Should NOT appear in AR counts (prestandard filter).
    goalPrestandard = await Goal.create(
      {
        name: 'Prestandard Goal - Teaching Practices',
        grantId: grant2.id,
        goalTemplateId: templateTeachingPractices.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: 6,
        prestandard: true,
      },
      { hooks: false },
    );

    // templateForOldTRTest on grant — enables the template but the session has a pre-cutoff startDate.
    goalForOldTRTest = await Goal.create(
      {
        name: 'Old TR Date Test Goal',
        grantId: grant.id,
        goalTemplateId: templateForOldTRTest.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: false,
        onApprovedAR: false,
        rtrOrder: 7,
        prestandard: false,
      },
      { hooks: false },
    );

    // ── AR goal links ──────────────────────────────────────────────────────────
    argApproved1 = await ActivityReportGoal.create({
      activityReportId: approvedReport.id,
      goalId: goalApproved1.id,
    });

    argApproved2 = await ActivityReportGoal.create({
      activityReportId: approvedReport.id,
      goalId: goalApproved2.id,
    });

    argOld = await ActivityReportGoal.create({
      activityReportId: approvedReportOld.id,
      goalId: goalOld.id,
    });

    argUnapproved = await ActivityReportGoal.create({
      activityReportId: unapprovedReport.id,
      goalId: goalUnapprovedAR.id,
    });

    argPrestandard = await ActivityReportGoal.create({
      activityReportId: approvedReport.id,
      goalId: goalPrestandard.id,
    });

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

    // First complete session: Teaching Practices + Family Engagement
    sessionComplete = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE, startDate: '10/01/2025', recipients: [{ value: grant.id, label: 'Test Recipient' }] },
    });

    // Second complete session on the SAME event: Teaching Practices only
    // Used to verify double-counting (each session counted separately).
    sessionComplete2 = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE, startDate: '10/01/2025', recipients: [{ value: grant.id, label: 'Test Recipient' }] },
    });

    // In-progress session: should not be counted
    sessionIncomplete = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, recipients: [{ value: grant.id, label: 'Test Recipient' }] },
    });

    junctionCompleteTP = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionComplete.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    junctionCompleteFE = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionComplete.id,
      goalTemplateId: templateFamilyEngagement.id,
    });

    junctionCompleteTP2 = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionComplete2.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    junctionIncomplete = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionIncomplete.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    // Separate event/session: template only has a backdated Goal → excluded by TR date filter
    eventForOldTRTest = await EventReportPilot.create({
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

    sessionForOldTRTest = await SessionReportPilot.create({
      eventId: eventForOldTRTest.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE, startDate: '08/15/2025', recipients: [{ value: grant.id, label: 'Test Recipient' }] },
    });

    // No junction row for sessionForOldTRTest — pre-cutoff sessions would never have
    // SessionReportPilotGoalTemplate rows in production, so the session is naturally
    // excluded from TR counts without any SQL date filter.

  });

  afterAll(async () => {
    // AR side (reverse dependency order)
    await ActivityReportGoal.destroy({
      where: {
        id: [
          argApproved1.id,
          argApproved2.id,
          argOld.id,
          argUnapproved.id,
          argPrestandard.id,
        ],
      },
      force: true,
    });

    await Goal.destroy({
      where: {
        id: [
          goalApproved1.id,
          goalApproved2.id,
          goalUnapprovedAR.id,
          goalOld.id,
          goalForTP.id,
          goalPrestandard.id,
          goalForOldTRTest.id,
        ],
      },
      force: true,
    });

    await ActivityRecipient.destroy({
      where: { id: [arRecipient1.id, arRecipient2.id, arRecipientUnapproved.id, arRecipientOld.id] },
      force: true,
    });

    await ActivityReport.destroy({
      where: { id: [approvedReport.id, approvedReportOld.id, unapprovedReport.id] },
      force: true,
    });

    // TR side
    await SessionReportPilotGoalTemplate.destroy({
      where: {
        id: [
          junctionCompleteTP.id,
          junctionCompleteFE.id,
          junctionCompleteTP2.id,
          junctionIncomplete.id,
        ],
      },
    });

    await SessionReportPilot.destroy({
      where: {
        id: [
          sessionComplete.id,
          sessionComplete2.id,
          sessionIncomplete.id,
          sessionForOldTRTest.id,
        ],
      },
      force: true,
    });

    await EventReportPilot.destroy({
      where: { id: [event.id, eventForOldTRTest.id] },
      force: true,
    });

    // Test-only template
    await GoalTemplate.destroy({ where: { id: templateForOldTRTest.id }, force: true });

    // Shared data
    await Grant.destroy({ where: { id: [grant.id, grant2.id] }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await User.destroy({ where: { id: user.id } });
  });

  // ─── Structural tests ──────────────────────────────────────────────────────

  it('returns activityReportCount and sessionReportCount for each category', async () => {
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    expect(Array.isArray(results)).toBe(true);
    results.forEach((row) => {
      expect(row).toHaveProperty('category');
      expect(row).toHaveProperty('activityReportCount');
      expect(row).toHaveProperty('sessionReportCount');
      expect(row).toHaveProperty('total');
      expect(typeof row.activityReportCount).toBe('number');
      expect(typeof row.sessionReportCount).toBe('number');
      expect(typeof row.total).toBe('number');
      expect(row.total).toBe(row.activityReportCount + row.sessionReportCount);
    });
  });

  // ─── AR filtering ─────────────────────────────────────────────────────────

  it('only counts approved ARs — unapproved reports are excluded', async () => {
    // Child Safety is only linked to an unapproved AR (unapprovedReport.id);
    // its AR count must be 0.
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const row = results.find((r) => r.category === templateChildSafety.standard);
    // unapprovedReport.id must not contribute — Child Safety AR count must be exactly 0.
    expect(row?.activityReportCount ?? 0).toBe(0);
  });

  it('excludes ARs with startDate before 2025-09-01', async () => {
    // Create a dedicated recipient whose only ERSEA link goes through approvedReportOld.id
    // (startDate=2025-08-15). This lets us assert that specific report is excluded.
    const oldRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 60000, max: 80000 })),
      name: faker.company.companyName(),
      uei: faker.datatype.string(12).toUpperCase(),
    });
    const oldGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 60000, max: 80000 })),
      number: faker.datatype.string(8),
      regionId: grant.regionId,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId: oldRecipient.id,
    });
    const oldGoal = await Goal.create(
      {
        name: 'Pre-cutoff AR Date Test Goal - ERSEA',
        grantId: oldGrant.id,
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
    const oldArg = await ActivityReportGoal.create({
      activityReportId: approvedReportOld.id,
      goalId: oldGoal.id,
    });
    const oldArRecipient = await ActivityRecipient.create({
      activityReportId: approvedReportOld.id,
      grantId: oldGrant.id,
    });

    try {
      // Part 1: scope to oldRecipient only — approvedReportOld.id (startDate=2025-08-15)
      // is the only ERSEA-linked approved AR. The startDate filter must exclude it → count = 0.
      const excludedScopes = await filtersToScopes({
        'recipientId.in': [String(oldRecipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const excludedResults = await approvedARAndTRByGoalCategory(excludedScopes);
      const erseaExcluded = excludedResults.find((r) => r.category === templateERSEA.standard);
      expect(erseaExcluded?.activityReportCount ?? 0).toBe(0);

      // Part 2: scope to recipient only — approvedReport.id (startDate=today)
      // is the only ERSEA-linked approved AR. It must be counted → count = 1.
      const includedScopes = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const includedResults = await approvedARAndTRByGoalCategory(includedScopes);
      const erseaIncluded = includedResults.find((r) => r.category === templateERSEA.standard);
      expect(erseaIncluded).toBeDefined();
      expect(erseaIncluded.activityReportCount).toBe(1);
    } finally {
      await ActivityReportGoal.destroy({ where: { id: oldArg.id }, force: true });
      await ActivityRecipient.destroy({ where: { id: oldArRecipient.id }, force: true });
      await Goal.destroy({ where: { id: oldGoal.id }, force: true });
      await Grant.destroy({ where: { id: oldGrant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: oldRecipient.id } });
    }
  });

  it('excludes prestandard goals from AR counts', async () => {
    // goalPrestandard (Teaching Practices, grant2, prestandard=true) is on an approved AR
    // but must not be counted because prestandard: false is required.
    // goalForTP (Teaching Practices, grant, prestandard=false) is NOT on any AR.
    // Therefore Teaching Practices AR count must be 0.
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.activityReportCount).toBe(0);
  });

  // ─── TR filtering ──────────────────────────────────────────────────────────

  it('only counts complete session reports — in-progress sessions are excluded', async () => {
    // Teaching Practices has: sessionComplete (complete) + sessionComplete2 (complete)
    // + sessionIncomplete (in-progress, excluded).
    // Expected TR count = 2.
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.sessionReportCount).toBe(2);
  });

  it('ignores malformed session recipient values instead of throwing', async () => {
    const malformedSession = await SessionReportPilot.create({
      eventId: event.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        startDate: '10/01/2025',
        recipients: [{ value: '', label: 'Malformed Recipient' }],
      },
    });
    const malformedJunction = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: malformedSession.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    try {
      const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
      const results = await approvedARAndTRByGoalCategory(scopes);

      const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
      expect(tpRow).toBeDefined();
      // The malformed recipient should not match any grant and should not inflate counts.
      expect(tpRow.sessionReportCount).toBe(2);
    } finally {
      await SessionReportPilotGoalTemplate.destroy({ where: { id: malformedJunction.id } });
      await SessionReportPilot.destroy({ where: { id: malformedSession.id }, force: true });
    }
  });

  it('excludes TR sessions with data.startDate before 2025-09-01', async () => {
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    // sessionForOldTRTest.id has data.startDate = '08/15/2025' (pre-cutoff).
    // Lookup by templateForOldTRTest.id to find the isolated standard it maps to.
    const reloaded = await GoalTemplate.findByPk(templateForOldTRTest.id, { attributes: ['standard'] });
    const isolatedStandard = reloaded.standard;

    // sessionForOldTRTest.id must NOT be counted — its startDate is before the cutoff.
    const oldRow = results.find((r) => r.category === isolatedStandard);
    expect(oldRow?.sessionReportCount ?? 0).toBe(0);

    // Cross-check: sessionComplete.id and sessionComplete2.id (startDate='10/01/2025')
    // ARE counted — confirming post-cutoff sessions pass the filter.
    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.sessionReportCount).toBe(2); // sessionComplete.id + sessionComplete2.id
  });

  it('counts each session report separately for the same event (double-counting)', async () => {
    // sessionComplete and sessionComplete2 are both complete sessions on the same event.
    // Teaching Practices is linked to both via junctionCompleteTP and junctionCompleteTP2.
    // Each approved session counts once → TR count = 2.
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.sessionReportCount).toBe(2);
  });

  // ─── Cross-side / merge behaviour ─────────────────────────────────────────

  it('returns 0 sessionReportCount for AR-only categories', async () => {
    // ERSEA has approved AR goals but no session report links in our test data.
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const erseaRow = results.find((r) => r.category === templateERSEA.standard);
    expect(erseaRow).toBeDefined();
    expect(erseaRow.sessionReportCount).toBe(0);
  });

  it('returns 0 activityReportCount for TR-only categories', async () => {
    // Teaching Practices has complete session reports but no qualifying AR goals
    // (goalForTP is not linked to any AR; goalPrestandard is excluded by prestandard filter).
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
    expect(tpRow).toBeDefined();
    expect(tpRow.activityReportCount).toBe(0);
  });

  it('populates both counts for categories present on AR and TR sides', async () => {
    // Family Engagement: goalApproved2 (approved AR) + junctionCompleteFE (complete session).
    // goalApproved2 provides the qualifying non-prestandard goal for the Family Engagement template.
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const feRow = results.find((r) => r.category === templateFamilyEngagement.standard);
    expect(feRow).toBeDefined();
    expect(feRow.activityReportCount).toBe(1);
    expect(feRow.sessionReportCount).toBe(1);
    expect(feRow.total).toBe(2);
  });

  it('excludes Monitoring standard from results', async () => {
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const monitoringRow = results.find((r) => r.category === 'Monitoring');
    expect(monitoringRow).toBeUndefined();
  });

  it('results are sorted alphabetically by category', async () => {
    const scopes = await filtersToScopes({ 'recipientId.in': [String(recipient.id)], 'region.in': [String(grant.regionId)] });
    const results = await approvedARAndTRByGoalCategory(scopes);

    const categories = results.map((r) => r.category);
    expect(categories).toEqual([...categories].sort((a, b) => a.localeCompare(b)));
  });

  it('returns empty array when no AR or TR data matches scopes', async () => {
    const scopes = await filtersToScopes({ 'region.in': ['999'] });
    const results = await approvedARAndTRByGoalCategory(scopes);
    expect(results).toEqual([]);
  });

  // ─── Recipient isolation ───────────────────────────────────────────────────

  it('AR count excludes goals belonging to a different recipient even on the same AR', async () => {
    // Create a second recipient with its own grant (same region so it passes the
    // region scope, but different recipientId so it fails a recipientId scope).
    const otherRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      name: faker.company.companyName(),
      uei: faker.datatype.string(12).toUpperCase(),
    });
    const otherGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      number: faker.datatype.string(8),
      regionId: grant.regionId,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId: otherRecipient.id,
    });

    // Goal on otherGrant using the ERSEA template — non-prestandard.
    const isolationGoal = await Goal.create(
      {
        name: 'Isolation Test Goal - ERSEA other recipient',
        grantId: otherGrant.id,
        goalTemplateId: templateERSEA.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: 99,
        prestandard: false,
      },
      { hooks: false },
    );

    // Link this goal to the same approvedReport that has recipient's grants.
    const isolationArg = await ActivityReportGoal.create({
      activityReportId: approvedReport.id,
      goalId: isolationGoal.id,
    });
    // Also link the AR to the other grant as an activity recipient.
    const isolationArRecipient = await ActivityRecipient.create({
      activityReportId: approvedReport.id,
      grantId: otherGrant.id,
    });

    try {
      // Scoped to the first recipient only — isolationGoal must not inflate ERSEA count.
      const scopedToFirstRecipient = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopedToFirstRecipient);

      // ERSEA count should still be 1 (goalApproved1 on grant), not 2.
      const erseaRow = results.find((r) => r.category === templateERSEA.standard);
      expect(erseaRow).toBeDefined();
      expect(erseaRow.activityReportCount).toBe(1);
    } finally {
      await ActivityReportGoal.destroy({ where: { id: isolationArg.id }, force: true });
      await ActivityRecipient.destroy({ where: { id: isolationArRecipient.id }, force: true });
      await Goal.destroy({ where: { id: isolationGoal.id }, force: true });
      await Grant.destroy({ where: { id: otherGrant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: otherRecipient.id } });
    }
  });

  it('TR count excludes sessions belonging to a different recipient in the same region', async () => {
    // Second recipient — same region, different recipientId.
    const otherRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      name: faker.company.companyName(),
      uei: faker.datatype.string(12).toUpperCase(),
    });
    const otherGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      number: faker.datatype.string(8),
      regionId: grant.regionId,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId: otherRecipient.id,
    });

    // A qualifying goal on otherGrant for the template (recipient/grant isolation test).
    const otherGoalForTP = await Goal.create(
      {
        name: 'Other Recipient TP Goal',
        grantId: otherGrant.id,
        goalTemplateId: templateTeachingPractices.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: false,
        onApprovedAR: false,
        rtrOrder: 98,
        prestandard: false,
      },
      { hooks: false },
    );

    // A complete session on the same event linked to otherGrant (not to recipient's grants).
    const otherSession = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE, startDate: '10/01/2025', recipients: [{ value: otherGrant.id, label: 'Other Recipient' }] },
    });
    const otherJunction = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: otherSession.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    try {
      // Scoped to the first recipient — Teaching Practices TR count must remain 2,
      // not 3 (the otherSession must not be included).
      const scopedToFirstRecipient = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopedToFirstRecipient);

      const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
      expect(tpRow).toBeDefined();
      expect(tpRow.sessionReportCount).toBe(2);
    } finally {
      await SessionReportPilotGoalTemplate.destroy({ where: { id: otherJunction.id } });
      await SessionReportPilot.destroy({ where: { id: otherSession.id }, force: true });
      await Goal.destroy({ where: { id: otherGoalForTP.id }, force: true });
      await Grant.destroy({ where: { id: otherGrant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: otherRecipient.id } });
    }
  });

  it('TR count excludes a template whose only post-cutoff Goal belongs to a different recipient', async () => {
    // Create a template that has NO qualifying goal for the first recipient.
    const uniqueSuffix = faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }));
    const leakTemplate = await GoalTemplate.create({
      templateName: `(Leak Test ${uniqueSuffix}) Recipient Cutoff Template`,
      creationMethod: CREATION_METHOD.CURATED,
    });

    // Second recipient in same region.
    const otherRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      name: faker.company.companyName(),
      uei: faker.datatype.string(12).toUpperCase(),
    });
    const otherGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      number: faker.datatype.string(8),
      regionId: grant.regionId,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId: otherRecipient.id,
    });

    // Goal on otherGrant — qualifies leakTemplate only for otherRecipient (recipient isolation).
    const otherGoal = await Goal.create(
      {
        name: 'Other Recipient Post-Cutoff Goal for Leak Template',
        grantId: otherGrant.id,
        goalTemplateId: leakTemplate.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: false,
        onApprovedAR: false,
        rtrOrder: 97,
        prestandard: false,
      },
      { hooks: false },
    );

    // Complete session for recipient's grant linked to leakTemplate.
    const leakSession = await SessionReportPilot.create({
      eventId: event.id,
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE, startDate: '10/01/2025', recipients: [{ value: grant.id, label: 'Test Recipient' }] },
    });
    const leakJunction = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: leakSession.id,
      goalTemplateId: leakTemplate.id,
    });

    try {
      const scopedToFirstRecipient = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopedToFirstRecipient);

      // leakTemplate's standard must not appear — the only qualifying goal is on otherGrant.
      const reloaded = await GoalTemplate.findByPk(leakTemplate.id, { attributes: ['standard'] });
      const leakStandard = reloaded.standard;
      const leakRow = results.find((r) => r.category === leakStandard);
      expect(leakRow).toBeUndefined();
    } finally {
      await SessionReportPilotGoalTemplate.destroy({ where: { id: leakJunction.id } });
      await SessionReportPilot.destroy({ where: { id: leakSession.id }, force: true });
      await Goal.destroy({ where: { id: otherGoal.id }, force: true });
      await Grant.destroy({ where: { id: otherGrant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: otherRecipient.id } });
      await GoalTemplate.destroy({ where: { id: leakTemplate.id }, force: true });
    }
  });

  it('AR count excludes a template whose only post-cutoff Goal belongs to a different recipient', async () => {
    // Create a template with no qualifying goal for the first recipient.
    const uniqueSuffix = faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }));
    const leakTemplate = await GoalTemplate.create({
      templateName: `(AR Leak Test ${uniqueSuffix}) Recipient Cutoff Template`,
      creationMethod: CREATION_METHOD.CURATED,
    });

    // Second recipient in same region.
    const otherRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      name: faker.company.companyName(),
      uei: faker.datatype.string(12).toUpperCase(),
    });
    const otherGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 50000, max: 70000 })),
      number: faker.datatype.string(8),
      regionId: grant.regionId,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2027, 1, 1),
      recipientId: otherRecipient.id,
    });

    // Goal on otherGrant — would qualify the template if the grant filter were absent.
    const otherGoal = await Goal.create(
      {
        name: 'Other Recipient AR Leak Goal',
        grantId: otherGrant.id,
        goalTemplateId: leakTemplate.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: 96,
        prestandard: false,
      },
      { hooks: false },
    );

    // Link the goal to the shared approvedReport via an ActivityReportGoal.
    const leakArg = await ActivityReportGoal.create({
      activityReportId: approvedReport.id,
      goalId: otherGoal.id,
    });
    const leakArRecipient = await ActivityRecipient.create({
      activityReportId: approvedReport.id,
      grantId: otherGrant.id,
    });

    try {
      const scopedToFirstRecipient = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopedToFirstRecipient);

      // leakTemplate's standard must not appear in AR results.
      const reloaded = await GoalTemplate.findByPk(leakTemplate.id, { attributes: ['standard'] });
      const leakStandard = reloaded.standard;
      const leakRow = results.find((r) => r.category === leakStandard);
      expect(leakRow === undefined || leakRow.activityReportCount === 0).toBe(true);
    } finally {
      await ActivityReportGoal.destroy({ where: { id: leakArg.id }, force: true });
      await ActivityRecipient.destroy({ where: { id: leakArRecipient.id }, force: true });
      await Goal.destroy({ where: { id: otherGoal.id }, force: true });
      await Grant.destroy({ where: { id: otherGrant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: otherRecipient.id } });
      await GoalTemplate.destroy({ where: { id: leakTemplate.id }, force: true });
    }
  });

  it('TR counts a session once even when its recipients array lists multiple scoped grants', async () => {
    // A session whose data.recipients contains BOTH grant.id and grant2.id
    // (matching the real-world shape: multiple recipients per session).
    // It should count as 1 session, not 2.
    const multiRecipientSession = await SessionReportPilot.create({
      eventId: event.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        startDate: '10/01/2025',
        recipients: [
          { value: grant.id, label: 'First Grant' },
          { value: grant2.id, label: 'Second Grant' },
        ],
      },
    });
    const multiJunction = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: multiRecipientSession.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    try {
      const scopes = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopes);

      const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
      expect(tpRow).toBeDefined();
      // baseline (sessionComplete + sessionComplete2) = 2, plus this new session = 3; NOT 4
      expect(tpRow.sessionReportCount).toBe(3);
    } finally {
      await SessionReportPilotGoalTemplate.destroy({ where: { id: multiJunction.id } });
      await SessionReportPilot.destroy({ where: { id: multiRecipientSession.id }, force: true });
    }
  });

  it('TR count excludes a template whose only qualifying goal for the recipient is prestandard', async () => {
    // Create a template with only a prestandard=true goal on the recipient's grant.
    // The session links to that template — it must not appear in results.
    const uniqueSuffix = faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }));
    const prestandardTemplate = await GoalTemplate.create({
      templateName: `(Prestandard Qual Test ${uniqueSuffix}) TR Prestandard Template`,
      creationMethod: CREATION_METHOD.CURATED,
    });

    const prestandardQualGoal = await Goal.create(
      {
        name: 'Prestandard Qual Goal for TR',
        grantId: grant.id,
        goalTemplateId: prestandardTemplate.id,
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onAR: false,
        onApprovedAR: false,
        rtrOrder: 95,
        prestandard: true, // ← only goal; must prevent template from qualifying
      },
      { hooks: false },
    );

    const prestandardSession = await SessionReportPilot.create({
      eventId: event.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        startDate: '10/01/2025',
        recipients: [{ value: grant.id, label: 'Test Recipient' }],
      },
    });
    const prestandardJunction = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: prestandardSession.id,
      goalTemplateId: prestandardTemplate.id,
    });

    try {
      const scopes = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopes);

      const reloaded = await GoalTemplate.findByPk(prestandardTemplate.id, { attributes: ['standard'] });
      const prestandardStandard = reloaded.standard;
      const prestandardRow = results.find((r) => r.category === prestandardStandard);
      // Template must not appear — its only qualifying goal is prestandard.
      expect(prestandardRow?.sessionReportCount ?? 0).toBe(0);
    } finally {
      await SessionReportPilotGoalTemplate.destroy({ where: { id: prestandardJunction.id } });
      await SessionReportPilot.destroy({ where: { id: prestandardSession.id }, force: true });
      await Goal.destroy({ where: { id: prestandardQualGoal.id }, force: true });
      await GoalTemplate.destroy({ where: { id: prestandardTemplate.id }, force: true });
    }
  });

  it('TR excludes a complete session with no startDate in data', async () => {
    // A session that is Complete but has no startDate — in production, sessions without
    // a startDate would not have goal template junction rows, so they are naturally excluded.
    const noDateSession = await SessionReportPilot.create({
      eventId: event.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        // intentionally no startDate
        recipients: [{ value: grant.id, label: 'Test Recipient' }],
      },
    });

    try {
      const scopes = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopes);

      const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
      expect(tpRow).toBeDefined();
      // Session without a startDate has no junction row and must not inflate the count (baseline = 2).
      expect(tpRow.sessionReportCount).toBe(2);
    } finally {
      await SessionReportPilot.destroy({ where: { id: noDateSession.id }, force: true });
    }
  });

  it('TR excludes a complete session whose startDate is in ISO format (not MM/DD/YYYY)', async () => {
    // A session with an ISO-format startDate — in production such a session would not
    // have goal template junction rows, so it is naturally excluded without any SQL date filter.
    const isoDateSession = await SessionReportPilot.create({
      eventId: event.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        startDate: '2025-10-01', // ISO format
        recipients: [{ value: grant.id, label: 'Test Recipient' }],
      },
    });

    try {
      const scopes = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopes);

      const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
      expect(tpRow).toBeDefined();
      // Session with no junction row must not inflate the count (baseline = 2).
      expect(tpRow.sessionReportCount).toBe(2);
    } finally {
      await SessionReportPilot.destroy({ where: { id: isoDateSession.id }, force: true });
    }
  });

  it('TR excludes a complete session with an empty recipients array', async () => {
    // recipients: [] means no grant IDs can match — the session must be excluded
    // without crashing (exercises the ELSE '[]'::jsonb fallback).
    const emptyRecipientsSession = await SessionReportPilot.create({
      eventId: event.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
        startDate: '10/01/2025',
        recipients: [],
      },
    });
    const emptyRecipientsJunction = await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: emptyRecipientsSession.id,
      goalTemplateId: templateTeachingPractices.id,
    });

    try {
      const scopes = await filtersToScopes({
        'recipientId.in': [String(recipient.id)],
        'region.in': [String(grant.regionId)],
      });
      const results = await approvedARAndTRByGoalCategory(scopes);

      const tpRow = results.find((r) => r.category === templateTeachingPractices.standard);
      expect(tpRow).toBeDefined();
      // Session with no recipients must not inflate the count (baseline = 2).
      expect(tpRow.sessionReportCount).toBe(2);
    } finally {
      await SessionReportPilotGoalTemplate.destroy({ where: { id: emptyRecipientsJunction.id } });
      await SessionReportPilot.destroy({ where: { id: emptyRecipientsSession.id }, force: true });
    }
  });
});
