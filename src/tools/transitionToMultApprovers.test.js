// The transitionToMultApprovers script being run in this this test has the ability to
// change any activity reports added by other tests that are running simultaneously.
// This will change activity reports using the old "single approver" style values, to the new
// "multiple approver" style values.

import transitionToMultApprovers from './transitionToMultApprovers';
import db, {
  ActivityReport,
  ActivityReportApprover,
  User,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import { auditLogger } from '../logger';

jest.mock('../logger');

const author = {
  id: 44454611,
  homeRegionId: 1,
  hsesUsername: 'user44454611',
  hsesUserId: 'user44454611',
};

const manager = {
  id: 55541619,
  homeRegionId: 2,
  hsesUsername: 'user55541619',
  hsesUserId: 'user55541619',
};

const reportObject = {
  userId: author.id,
  regionId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 11,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  activityRecipientType: 'something',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

describe('Transition to multiple approvers script', () => {
  beforeAll(async () => {
    await User.bulkCreate([author, manager]);
  });

  afterEach(async () => {
    await ActivityReportApprover.destroy({ where: { userId: manager.id }, force: true });
    await ActivityReport.unscoped().destroy({ where: { userId: author.id } });
  });

  afterAll(async () => {
    await User.destroy({ where: { id: [author.id, manager.id] } });
    await db.sequelize.close();
  });

  it('DRAFT report statuses updated and approver created', async () => {
    const draftReport = {
      ...reportObject,
      id: 2840962,
      submissionStatus: REPORT_STATUSES.DRAFT,
    };
    // Users can save approvers to report before they submit
    const draftReportWithApprover = {
      ...reportObject,
      id: 6671863,
      oldApprovingManagerId: manager.id,
      submissionStatus: REPORT_STATUSES.DRAFT,
    };
    await ActivityReport.bulkCreate([draftReport, draftReportWithApprover], {
      individualHooks: false,
    });
    await transitionToMultApprovers();

    // check report statuses
    const reports = await ActivityReport.findAll({
      where: { id: [draftReport.id, draftReportWithApprover.id] },
    });
    expect(reports.length).toBe(2);
    expect(reports[0].submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
    expect(reports[1].submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
    expect(reports[0].calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
    expect(reports[1].calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

    // check approver created only for draftReportWithApprover
    const approvers = await ActivityReportApprover.findAll({
      where: { activityReportId: [draftReport.id, draftReportWithApprover.id] },
    });
    expect(approvers.length).toBe(1);
    expect(approvers[0].activityReportId).toEqual(draftReportWithApprover.id);
    expect(approvers[0].note).toBeNull();
    expect(approvers[0].status).toBeNull();
    expect(auditLogger.info).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalledTimes(0);
  });

  it('DELETED report statuses correct', async () => {
    const deletedReport = {
      ...reportObject,
      id: 1549061,
      submissionStatus: REPORT_STATUSES.DELETED,
    };
    await ActivityReport.create(deletedReport, {
      hooks: false,
    });
    await transitionToMultApprovers();

    const deleted = await ActivityReport.unscoped().findAll({
      where: { id: deletedReport.id },
    });
    expect(deleted.length).toBe(1);
    expect(deleted[0].submissionStatus).toEqual(REPORT_STATUSES.DELETED);
    expect(deleted[0].calculatedStatus).toEqual(REPORT_STATUSES.DELETED);
  });

  it('SUBMITTED report statuses correct, approver created', async () => {
    const submittedReport = {
      ...reportObject,
      id: 3492943,
      oldApprovingManagerId: manager.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
    };
    await ActivityReport.create(submittedReport, {
      hooks: false,
    });
    await transitionToMultApprovers();

    // check report statuses
    const reports = await ActivityReport.findAll({
      where: { id: submittedReport.id },
    });
    expect(reports.length).toBe(1);
    expect(reports[0].submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
    expect(reports[0].calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

    // check approver created only for draftReportWithApprover
    const approvers = await ActivityReportApprover.findAll({
      where: { activityReportId: submittedReport.id },
    });
    expect(approvers.length).toBe(1);
    expect(approvers[0].note).toBeNull();
    expect(approvers[0].status).toBeNull();
  });

  it('NEEDS_ACTION report statuses correct, approver created', async () => {
    const needsActionReport = {
      ...reportObject,
      id: 4513484,
      oldApprovingManagerId: manager.id,
      oldManagerNotes: 'make changes',
      submissionStatus: REPORT_STATUSES.NEEDS_ACTION,
    };
    // Approver creation succeeded, but status update failed
    const messReportOne = {
      ...reportObject,
      id: 8816048,
      oldApprovingManagerId: manager.id,
      oldManagerNotes: 'make changes to mess 1',
      submissionStatus: REPORT_STATUSES.NEEDS_ACTION,
      calculatedStatus: null,
    };
    const approverForMessReportOne = {
      activityReportId: messReportOne.id,
      userId: manager.id,
      status: REPORT_STATUSES.NEEDS_ACTION,
      note: 'make changes to mess 1',
    };
    // Approver creation failed, but status update succeeded
    const messReportTwo = {
      ...reportObject,
      id: 9916048,
      oldApprovingManagerId: manager.id,
      oldManagerNotes: 'make changes to mess 2',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
    };
    await ActivityReport.bulkCreate([needsActionReport, messReportOne, messReportTwo], {
      individualHooks: false,
    });
    await ActivityReportApprover.create(approverForMessReportOne, { hooks: false });
    await transitionToMultApprovers();

    // check reports statuses
    const reports = await ActivityReport.findAll({
      where: {
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        userId: author.id,
      },
    });
    expect(reports.length).toBe(3);

    // check approvers
    const needsActionReportApprovers = await ActivityReportApprover.findAll({
      where: { activityReportId: needsActionReport.id },
    });
    expect(needsActionReportApprovers.length).toBe(1);
    expect(needsActionReportApprovers[0].note).toEqual(needsActionReport.oldManagerNotes);
    expect(needsActionReportApprovers[0].status).toEqual(REPORT_STATUSES.NEEDS_ACTION);

    const messReportOneApprovers = await ActivityReportApprover.findAll({
      where: { activityReportId: messReportOne.id },
    });
    expect(messReportOneApprovers.length).toBe(1);
    expect(messReportOneApprovers[0].note).toEqual(messReportOne.oldManagerNotes);
    expect(messReportOneApprovers[0].status).toEqual(REPORT_STATUSES.NEEDS_ACTION);

    const messReportTwoApprovers = await ActivityReportApprover.findAll({
      where: { activityReportId: messReportTwo.id },
    });
    expect(messReportTwoApprovers.length).toBe(1);
    expect(messReportTwoApprovers[0].note).toEqual(messReportTwo.oldManagerNotes);
    expect(messReportTwoApprovers[0].status).toEqual(REPORT_STATUSES.NEEDS_ACTION);
  });

  it('APPROVED report statuses correct, approver created', async () => {
    const approvedReport = {
      ...reportObject,
      id: 5721595,
      oldApprovingManagerId: manager.id,
      oldManagerNotes: 'great work',
      submissionStatus: REPORT_STATUSES.APPROVED,
    };
    // Test that no changes made to pre-existing multi approver report
    const unchangedReport = {
      ...reportObject,
      id: 7716048,
      oldApprovingManagerId: manager.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
    };
    const approverForUnchangedReport = {
      activityReportId: unchangedReport.id,
      userId: manager.id,
      status: REPORT_STATUSES.APPROVED,
    };
    await ActivityReport.bulkCreate([approvedReport, unchangedReport], {
      individualHooks: false,
    });
    await ActivityReportApprover.create(approverForUnchangedReport, { hooks: false });
    await transitionToMultApprovers();

    const reports = await ActivityReport.findAll({
      where: {
        calculatedStatus: REPORT_STATUSES.APPROVED,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        userId: author.id,
      },
    });
    expect(reports.length).toBe(2);
    const approvers = await ActivityReportApprover.findAll({
      where: { activityReportId: [reports[0].id, reports[1].id] },
      order: [['activityReportId', 'ASC']],
    });
    expect(approvers.length).toBe(2);
    expect(approvers[0].note).toEqual(approvedReport.oldManagerNotes);
    expect(approvers[0].status).toEqual(REPORT_STATUSES.APPROVED);
  });
});
