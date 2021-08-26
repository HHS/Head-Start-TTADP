import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, NextStep,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import updateReasonNames from './updateReasonNames';

const GRANTEE_ID = 30;
const GRANTEE_ID_TWO = 31;

const mockUser = {
  id: 1005,
  homeRegionId: 1,
  name: 'chud1005',
  hsesUsername: 'chud1005',
  hsesUserId: '1005',
};

const reportObject = {
  regionId: 1,
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID },
    { activityRecipientId: GRANTEE_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

const legacyReportObject = {
  regionId: 1,
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID },
    { activityRecipientId: GRANTEE_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
  legacyId: 'legacy-1',
  imported: {
    manager: 'Manager4099@Test.Gov',
    createdBy: 'user4096@Test.gov',
    otherSpecialists: 'user4097@TEST.gov, user4098@test.gov',
    reasons: null,
  },
};

describe('update reason names job', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });

    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID, number: '1', granteeId: GRANTEE_ID, regionId: 1, status: 'Active',
      },
    });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID_TWO, number: '2', granteeId: GRANTEE_ID, regionId: 1, status: 'Active',
      },
    });
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_TWO] } });
    await Grantee.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_TWO] } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates old reasons in the database', async () => {
    // Report 1- Replace All.
    const report1 = await ActivityReport.create({
      ...reportObject,
      requester: 'Req 1',

      reason: [
        'Monitoring | Under Enrollment',
        'Need: Data Training or Analysis',
        'Need: Professional Development',
        'Need: Quality Improvement Support',
        'Need: Program Planning',
        'Need: School Readiness',
        'Professional Development',
      ],
    });

    // Report 2 - Mixed bag keep DISTINCT Non Legacy Reasons.
    const report2 = await ActivityReport.create({
      ...reportObject,
      requester: 'Req 2',

      reason: [
        'Child Incidents',
        'Full Enrollment',
        'Monitoring | Under Enrollment',
        'Need: Data Training or Analysis',
        'Need: Quality Improvement Support',
        'Ongoing Quality Improvement',
        'New Program Option',
      ],
    });

    // Report 3 - Only new Reasons (no change).
    const report3 = await ActivityReport.create({
      ...reportObject,
      requester: 'Req 3',

      reason: [
        'Change in Scope',
        'Child Incidents',
        'Complaint',
      ],
    });

    // Report 4 - No Reasons.
    const report4 = await ActivityReport.create({
      ...reportObject,
      requester: 'Req 4',
      reason: [],
    });

    // Report 5 - Draft Status (ignore scopes).
    const report5 = await ActivityReport.create({
      ...reportObject,
      requester: 'Req 5',
      reason: ['Need: Program Planning', 'Need: Professional Development', 'Child Incidents'],
      status: REPORT_STATUSES.DRAFT,
    });

    // Update Reasons.
    await updateReasonNames();

    // Assert Report 1.
    const updateReport1 = await ActivityReport.findOne({ where: { id: report1.id } });
    const correctReportReasons1 = [
      'Full Enrollment',
      'Ongoing Quality Improvement',
      'Planning/Coordination (also TTA Plan Agreement)',
      'School Readiness Goals',
    ];
    expect(updateReport1.reason).toStrictEqual(correctReportReasons1);

    // Assert Report 2.
    const updateReport2 = await ActivityReport.findOne({ where: { id: report2.id } });
    const correctReportReasons2 = [
      'Child Incidents',
      'Full Enrollment',
      'Ongoing Quality Improvement',
      'New Program Option',
    ];
    expect(updateReport2.reason).toStrictEqual(correctReportReasons2);

    // Assert Report 3 (No Changes).
    const updatedReport3 = await ActivityReport.findOne({ where: { id: report3.id } });
    expect(updatedReport3).not.toBeNull();
    expect(updatedReport3.reason).toStrictEqual(report3.reason);

    // Assert Report 4 (No Changes).
    const updatedReportFour = await ActivityReport.findOne({ where: { id: report4.id } });
    expect(updatedReportFour).not.toBeNull();
    expect(updatedReportFour.reason).toStrictEqual(report4.reason);

    // Assert Report 5.
    const updateReport5 = await ActivityReport.findOne({ where: { id: report5.id } });
    const correctReasons5 = [
      'Planning/Coordination (also TTA Plan Agreement)',
      'Ongoing Quality Improvement',
      'Child Incidents',
    ];
    expect(updateReport5.reason).toStrictEqual(correctReasons5);
  });

  it('updates legacy reasons in the database', async () => {
    // Legacy Report 1- Replace All.
    const legacyReport1 = await ActivityReport.create({
      ...legacyReportObject,
      requester: 'Legacy Req 1',
      legacyId: 'legacy-1',
      imported: {
        reasons: 'Monitoring | Under Enrollment\nNeed: Data Training or Analysis\nNeed: Professional Development\nNeed: Quality Improvement Support\nNeed: Program Planning\nNeed: School Readiness\nProfessional Development',
      },
    });

    // Legacy Report 2 - Mixed bag keep DISTINCT Non Legacy Reasons.
    const legacyReport2 = await ActivityReport.create({
      ...legacyReportObject,
      legacyId: 'legacy-2',
      requester: 'Legacy Req 2',
      imported: {
        reasons: 'Child Incidents\nFull Enrollment\nMonitoring | Under Enrollment\nNeed: Data Training or Analysis\nNeed: Quality Improvement Support\nOngoing Quality Improvement\nNew Program Option',
      },
    });

    // Legacy Report 3 - Only new Reasons (no change).
    const legacyReport3 = await ActivityReport.create({
      ...legacyReportObject,
      legacyId: 'legacy-3',
      requester: 'Legacy Req 3',
      imported: {
        reasons: 'Change in Scope\nChild Incidents\nComplaint',
      },
    });

    // Legacy Report 4 - No Reasons.
    const legacyReport4 = await ActivityReport.create({
      ...legacyReportObject,
      legacyId: 'legacy-4',
      requester: 'Legacy Req 4',
      imported: {
        reasons: '',
      },
    });

    // Legacy Report 5 - Draft Report.
    const legacyReport5 = await ActivityReport.create({
      ...legacyReportObject,
      legacyId: 'legacy-5',
      requester: 'Legacy Req 5',
      status: REPORT_STATUSES.DRAFT,
      imported: {
        reasons: 'Need: Program Planning\nNeed: Professional Development\nChild Incidents',
      },
    });

    // Update Reasons.
    await updateReasonNames();

    // Assert Legacy Report 1.
    const updateReport1 = await ActivityReport.findOne({ where: { id: legacyReport1.id } });
    const correctLegacyReasons1 = 'Full Enrollment\nOngoing Quality Improvement\nPlanning/Coordination (also TTA Plan Agreement)\nSchool Readiness Goals';
    expect(updateReport1.imported.reasons).toStrictEqual(correctLegacyReasons1);

    // Assert Legacy Report 2.
    const updateReport2 = await ActivityReport.findOne({ where: { id: legacyReport2.id } });
    const correctLegacyReasons2 = 'Child Incidents\nFull Enrollment\nOngoing Quality Improvement\nNew Program Option';
    expect(updateReport2.imported.reasons).toStrictEqual(correctLegacyReasons2);

    // Assert Legacy Report 3.
    const updateLegacyReport3 = await ActivityReport.findOne({ where: { id: legacyReport3.id } });
    expect(updateLegacyReport3).not.toBeNull();
    expect(updateLegacyReport3.reason).toStrictEqual(legacyReport3.reason);

    // Assert Legacy Report 4.
    const updatedLegacyReport4 = await ActivityReport.findOne({ where: { id: legacyReport4.id } });
    expect(updatedLegacyReport4).not.toBeNull();
    expect(updatedLegacyReport4.reason).toStrictEqual(legacyReport4.reason);

    // Assert Legacy Report 5.
    const updateReport5 = await ActivityReport.findOne({ where: { id: legacyReport5.id } });
    const correctLegacyReasons5 = 'Planning/Coordination (also TTA Plan Agreement)\nOngoing Quality Improvement\nChild Incidents';
    expect(updateReport5.imported.reasons).toStrictEqual(correctLegacyReasons5);
  });

  it('updates both report type reasons in the database', async () => {
    // Legacy.
    const legacyReport = await ActivityReport.create({
      ...legacyReportObject,
      requester: 'Both Legacy Req 1',
      legacyId: 'both-legacy-1',
      imported: {
        reasons: 'Monitoring | Under Enrollment\nNeed: Data Training or Analysis\nNeed: Quality Improvement Support\nChild Incidents',
      },
    });

    // New.
    const newReport = await ActivityReport.create({
      ...reportObject,
      requester: 'Both Req 2',
      reason: [
        'Monitoring | Under Enrollment',
        'Need: Data Training or Analysis',
        'Need: Quality Improvement Support',
        'Child Incidents',
      ],
    });

    // Update Reasons.
    await updateReasonNames();

    // Assert Legacy.
    const updateLegacyReport = await ActivityReport.findOne({ where: { id: legacyReport.id } });
    const legacyReasons = 'Full Enrollment\nOngoing Quality Improvement\nChild Incidents';
    expect(updateLegacyReport.imported.reasons).toStrictEqual(legacyReasons);

    // Assert New.
    const updateNewReport = await ActivityReport.findOne({ where: { id: newReport.id } });
    const correctReasons = [
      'Full Enrollment',
      'Ongoing Quality Improvement',
      'Child Incidents',
    ];
    expect(updateNewReport.reason).toStrictEqual(correctReasons);
  });

  it('same report has new and legacy reasons', async () => {
    // Report has both Legacy and New reasons.
    const report1 = await ActivityReport.create({
      ...legacyReportObject,
      requester: 'Same Req 1',
      legacyId: 'same-legacy-1',
      imported: {
        reasons: 'Monitoring | Under Enrollment\nNeed: Data Training or Analysis\nNeed: Quality Improvement Support\nChild Incidents',
      },
      reason: [
        'Monitoring | Under Enrollment',
        'Need: Data Training or Analysis',
        'Need: Quality Improvement Support',
        'Child Incidents',
      ],
    });

    await updateReasonNames();

    const updateReport = await ActivityReport.findOne({ where: { id: report1.id } });

    // Check Legacy Reasons.
    const legacyReasons = 'Full Enrollment\nOngoing Quality Improvement\nChild Incidents';
    expect(updateReport.imported.reasons).toStrictEqual(legacyReasons);

    // Check New Reasons.
    const newReasons = [
      'Full Enrollment',
      'Ongoing Quality Improvement',
      'Child Incidents',
    ];
    expect(updateReport.reason).toStrictEqual(newReasons);
  });
});
