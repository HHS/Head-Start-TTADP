import db, {
  ActivityReport, ActivityReportApprover, ActivityReportCollaborator, ActivityRecipient, User,
  Grantee, NonGrantee, Grant, NextStep, Region, Permission,
} from '../models';
import {
  createOrUpdate,
  activityReportById,
  possibleRecipients,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReports,
  getAllDownloadableActivityReportAlerts,
  setStatus,
} from './activityReports';
import SCOPES from '../middleware/scopeConstants';
import { APPROVER_STATUSES, REPORT_STATUSES } from '../constants';

const GRANTEE_ID = 30;
const GRANTEE_ID_SORTING = 31;
const ALERT_GRANTEE_ID = 345;

const mockUser = {
  id: 1115665161,
  homeRegionId: 1,
  name: 'user1115665161',
  hsesUsername: 'user1115665161',
  hsesUserId: 'user1115665161',
};

const mockUserTwo = {
  id: 265157914,
  homeRegionId: 1,
  name: 'user265157914',
  hsesUserId: 'user265157914',
  hsesUsername: 'user265157914',
  role: ['COR'],
};

const mockUserThree = {
  id: 39861962,
  homeRegionId: 1,
  name: 'user39861962',
  hsesUserId: 'user39861962',
  hsesUsername: 'user39861962',
};

const mockUserFour = {
  id: 49861962,
  homeRegionId: 1,
  name: 'user49861962',
  hsesUserId: 'user49861962',
  hsesUsername: 'user49861962',
};

const mockUserFive = {
  id: 55861962,
  homeRegionId: 1,
  name: 'user55861962',
  hsesUserId: 'user55861962',
  hsesUsername: 'user55861962',
};

const alertsMockUserOne = {
  id: 16465416,
  homeRegionId: 1,
  name: 'a',
  hsesUserId: 'a',
  hsesUsername: 'a',
};

const alertsMockUserTwo = {
  id: 21161130,
  homeRegionId: 1,
  name: 'b',
  hsesUserId: 'b',
  hsesUsername: 'b',
};

const reportObject = {
  activityRecipientType: 'grantee',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: GRANTEE_ID }],
};

const submittedReport = {
  ...reportObject,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};
describe('Retrieve Alerts', () => {
  beforeAll(async () => {
    await Promise.all([
      User.bulkCreate([
        mockUserFour,
        mockUserFive,
      ]),
      NonGrantee.create({ id: ALERT_GRANTEE_ID, name: 'alert nonGrantee' }),
      Grantee.create({ name: 'alert grantee', id: ALERT_GRANTEE_ID }),
      Region.create({ name: 'office 20', id: 20 }),
    ]);
    await Grant.create({
      id: ALERT_GRANTEE_ID, number: 1, granteeId: ALERT_GRANTEE_ID, regionId: 20, status: 'Active',
    });
  });

  afterAll(async () => {
    const userIds = [
      mockUserFour.id,
      mockUserFive.id];
    const reports = await ActivityReport.findAll({ where: { userId: userIds } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true });
    await ActivityReportCollaborator.destroy({ where: { activityReportId: ids }, force: true });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: userIds } });
    await Permission.destroy({ where: { userId: userIds } });
    await NonGrantee.destroy({ where: { id: ALERT_GRANTEE_ID } });
    await Grant.destroy({ where: { id: [ALERT_GRANTEE_ID] } });
    await Grantee.destroy({ where: { id: [ALERT_GRANTEE_ID] } });
    await Region.destroy({ where: { id: 20 } });
  });

  it('retrieves myalerts', async () => {
    // Add User Permissions.
    await Permission.create({
      userId: mockUserFour.id,
      regionId: 1,
      scopeId: SCOPES.READ_REPORTS,
    });

    await Permission.create({
      userId: mockUserFive.id,
      regionId: 1,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    });

    // In Draft.
    await ActivityReport.create({
      ...reportObject,
      lastUpdatedById: mockUserFour.id,
      submissionStatus: REPORT_STATUSES.DRAFT,
      calculatedStatus: REPORT_STATUSES.DRAFT,
      userId: mockUserFour.id,
      activityRecipients: [{ activityRecipientId: ALERT_GRANTEE_ID }],
    });

    // Submitted.
    await ActivityReport.create({
      ...submittedReport,
      userId: mockUserFour.id,
      lastUpdatedById: mockUserFour.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      activityRecipients: [{ activityRecipientId: ALERT_GRANTEE_ID }],
    });

    // Needs Action.
    await ActivityReport.create({
      ...submittedReport,
      userId: mockUserFour.id,
      lastUpdatedById: mockUserFour.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      activityRecipients: [{ activityRecipientId: ALERT_GRANTEE_ID }],
    });

    // Approved (Should be missing).
    await ActivityReport.create({
      ...submittedReport,
      userId: mockUserFour.id,
      lastUpdatedById: mockUserFour.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      activityRecipients: [{ activityRecipientId: ALERT_GRANTEE_ID }],
    });

    // Is Only Approver.
    const isOnlyApproverReport = await ActivityReport.create({
      ...submittedReport,
      userId: mockUserFive.id,
      lastUpdatedById: mockUserFive.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      activityRecipients: [{ activityRecipientId: ALERT_GRANTEE_ID }],
    });

    // Add Approver.
    await ActivityReportApprover.create({
      activityReportId: isOnlyApproverReport.id,
      userId: mockUserFour.id,
      status: null,
    });

    // Is Only Collaborator.
    const isOnlyCollabReport = await ActivityReport.create({
      ...submittedReport,
      userId: mockUserFive.id,
      lastUpdatedById: mockUserFive.id,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      activityRecipients: [{ activityRecipientId: ALERT_GRANTEE_ID }],
    });

    // Add Collaborator.
    await ActivityReportCollaborator.create({
      activityReportId: isOnlyCollabReport.id,
      userId: mockUserFour.id,
    });
    const { count, rows } = await activityReportAlerts(mockUserFour.id, {});
    expect(count).toBe(5);
    expect(rows.length).toBe(5);
    expect(rows[0].userId).toBe(mockUserFour.id);
    expect(rows[1].userId).toBe(mockUserFour.id);
    expect(rows[2].userId).toBe(mockUserFour.id);
    expect(rows[3].userId).toBe(mockUserFive.id); // Approver Only.
    expect(rows[4].userId).toBe(mockUserFive.id); // Collaborator Only.
  });
});

const idsToExclude = [9999, 777, 778, 779];

describe('Activity Reports DB service', () => {
  beforeAll(async () => {
    await Promise.all([
      User.bulkCreate([
        mockUser,
        mockUserTwo,
        mockUserThree,
        alertsMockUserOne,
        alertsMockUserTwo,
      ]),
      NonGrantee.create({ id: GRANTEE_ID, name: 'nonGrantee' }),
      Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } }),
      Region.create({ name: 'office 19', id: 19 }),
    ]);
    await Grant.create({
      id: GRANTEE_ID, number: 1, granteeId: GRANTEE_ID, regionId: 19, status: 'Active',
    });
  });

  afterAll(async () => {
    const userIds = [
      mockUser.id,
      mockUserTwo.id,
      mockUserThree.id,
      alertsMockUserOne.id,
      alertsMockUserTwo.id,
      mockUserFour.id,
      mockUserFive.id];
    const reports = await ActivityReport.findAll({ where: { userId: userIds } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true });
    await ActivityReportCollaborator.destroy({ where: { activityReportId: ids }, force: true });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: userIds } });
    await Permission.destroy({ where: { userId: userIds } });
    await NonGrantee.destroy({ where: { id: GRANTEE_ID } });
    await Grant.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_SORTING] } });
    await Grantee.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_SORTING] } });
    await Region.destroy({ where: { id: 19 } });

    await db.sequelize.close();
  });

  describe('createOrUpdate', () => {
    it('updates an already saved report', async () => {
      const report = await ActivityReport.create({ ...reportObject, id: 3334 });
      await createOrUpdate({ ...report, ECLKCResourcesUsed: [{ value: 'updated' }] }, report);
      expect(report.activityRecipientType).toEqual('grantee');
      expect(report.calculatedStatus).toEqual('draft');
      expect(report.ECLKCResourcesUsed).toEqual(['updated']);
      expect(report.id).toEqual(3334);
    });

    it('creates a report with no recipient type', async () => {
      const emptyReport = {
        ECLKCResourcesUsed: [{ value: '' }],
        activityRecipientType: null,
        activityRecipients: [],
        activityType: [],
        additionalNotes: null,
        approvingManagerId: null,
        attachments: [],
        collaborators: [],
        context: '',
        deliveryMethod: null,
        duration: null,
        endDate: null,
        goals: [],
        granteeNextSteps: [],
        grantees: [],
        nonECLKCResourcesUsed: [{ value: '' }],
        numberOfParticipants: null,
        objectivesWithoutGoals: [],
        otherResources: [],
        participantCategory: '',
        participants: [],
        programTypes: [],
        reason: [],
        requester: null,
        specialistNextSteps: [],
        startDate: null,
        submissionStatus: REPORT_STATUSES.DRAFT,
        targetPopulations: [],
        topics: [],
        pageState: {
          1: 'Not started',
          2: 'Not started',
          3: 'Not started',
          4: 'Not started',
        },
        userId: mockUser.id,
        regionId: 1,
        ttaType: [],
        lastUpdatedById: 1,
      };

      const report = await createOrUpdate(emptyReport);
      expect(report.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
    });

    it('creates a new report', async () => {
      const beginningARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } });
      const report = await createOrUpdate(reportObject);
      const endARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } });
      expect(endARCount.length - beginningARCount.length).toBe(1);
      expect(report.activityRecipients[0].grant.id).toBe(GRANTEE_ID);
      // Check afterCreate copySubmissionStatus hook
      expect(report.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
    });

    it('creates a new report with non-grantee recipient', async () => {
      const report = await createOrUpdate({ ...reportObject, activityRecipientType: 'non-grantee' });
      expect(report.activityRecipients[0].nonGrantee.id).toBe(GRANTEE_ID);
    });

    it('handles reports with collaborators', async () => {
      const report = await createOrUpdate({
        ...reportObject,
        collaborators: [{ id: mockUser.id }],
      });
      expect(report.collaborators.length).toBe(1);
      expect(report.collaborators[0].name).toBe(mockUser.name);
    });

    it('handles notes being created', async () => {
      // Given an report with some notes
      const reportObjectWithNotes = {
        ...reportObject,
        specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      // When that report is created
      const report = await createOrUpdate(reportObjectWithNotes);
      // Then we see that it was saved correctly
      expect(report.specialistNextSteps.length).toBe(2);
      expect(report.granteeNextSteps.length).toBe(2);
      expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
      expect(report.granteeNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
    });

    it('handles specialist notes being created', async () => {
      // Given a report with specliasts notes
      // And no grantee notes
      const reportWithNotes = {
        ...reportObject,
        specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNextSteps: [],
      };

      // When that report is created
      const report = await createOrUpdate(reportWithNotes);

      // Then we see that it was saved correctly
      expect(report.granteeNextSteps.length).toBe(0);
      expect(report.specialistNextSteps.length).toBe(2);
      expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
    });

    it('handles grantee notes being created', async () => {
      // Given a report with grantee notes
      // And not specialist notes
      const reportWithNotes = {
        ...reportObject,
        specialistNextSteps: [],
        granteeNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };

      // When that report is created
      const report = await createOrUpdate(reportWithNotes);

      // Then we see that it was saved correctly
      expect(report.specialistNextSteps.length).toBe(0);
      expect(report.granteeNextSteps.length).toBe(2);
      expect(report.granteeNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
    });

    it('handles specialist notes being updated', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await ActivityReport.create(reportWithNotes);

      // When the report is updated with new set of specialist notes
      const notes = { specialistNextSteps: [{ note: 'harry' }, { note: 'spongebob' }] };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see it was updated correctly
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.specialistNextSteps.map((n) => n.note))
        .toEqual(expect.arrayContaining(['harry', 'spongebob']));
    });

    it('handles grantee notes being updated', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await ActivityReport.create(reportWithNotes);

      // When the report is updated with new set of grantee notes
      const notes = { granteeNextSteps: [{ note: 'One Piece' }, { note: 'spongebob' }] };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see it was updated correctly
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.granteeNextSteps.map((n) => n.note))
        .toEqual(expect.arrayContaining(['One Piece', 'spongebob']));
    });

    it('handles notes being updated to empty', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await ActivityReport.create(reportWithNotes);

      // When the report is updated with empty notes
      const notes = {
        granteeNextSteps: [],
        specialistNextSteps: [],
      };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see the report was updated correctly
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.granteeNextSteps.length).toBe(0);
      expect(updatedReport.specialistNextSteps.length).toBe(0);
    });

    it('handles notes being the same', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await createOrUpdate(reportWithNotes);
      const granteeIds = report.granteeNextSteps.map((note) => note.id);
      const specialistsIds = report.specialistNextSteps.map((note) => note.id);

      // When the report is updated with same notes
      const notes = {
        specialistNextSteps: report.specialistNextSteps,
        granteeNextSteps: report.granteeNextSteps,
      };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see nothing changes
      // And we are re-using the same old ids
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.granteeNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
      expect(updatedReport.granteeNextSteps.map((n) => n.id))
        .toEqual(expect.arrayContaining(granteeIds));

      expect(updatedReport.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
      expect(updatedReport.specialistNextSteps.map((n) => n.id))
        .toEqual(expect.arrayContaining(specialistsIds));
    });

    it('calls syncApprovers appropriately', async () => {
      const reportWithApprovers = {
        ...reportObject,
        approverUserIds: [mockUserTwo.id],
      };
      // Calls syncApprovers when approverUserIds is present
      const report = await createOrUpdate(reportWithApprovers);
      expect(report.approvers[0].User.id).toEqual(mockUserTwo.id);
      // When syncApprovers is undefined, skip call, avoid removing approvers
      const reportTwo = await createOrUpdate({ ...reportObject, regionId: 3 }, report);
      expect(reportTwo.approvers[0].User.id).toEqual(mockUserTwo.id);
      expect(reportTwo.regionId).toEqual(3);
    });
  });

  describe('activityReportByLegacyId', () => {
    it('returns the report with the legacyId', async () => {
      const report = await ActivityReport.create({ ...reportObject, legacyId: 'legacy' });
      const found = await activityReportByLegacyId('legacy');
      expect(found.id).toBe(report.id);
    });
  });

  describe('activityReportById', () => {
    it('retrieves an activity report', async () => {
      const report = await ActivityReport.create(reportObject);

      const foundReport = await activityReportById(report.id);
      expect(foundReport.id).toBe(report.id);
      expect(foundReport.ECLKCResourcesUsed).toEqual(['test']);
    });
    it('includes approver with full name', async () => {
      const report = await ActivityReport.create({ ...submittedReport, regionId: 5 });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockUserTwo.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'great job from user 2',
      });
      const foundReport = await activityReportById(report.id);
      expect(foundReport.approvers[0].User.get('fullName')).toEqual(`${mockUserTwo.name}, ${mockUserTwo.role[0]}`);
    });
    it('excludes soft deleted approvers', async () => {
      // To include deleted approvers in future add paranoid: false
      // attribute to include object for ActivityReportApprover
      // https://sequelize.org/master/manual/paranoid.html#behavior-with-other-queries
      const report = await ActivityReport.create(submittedReport);
      // Create needs_action approver
      const toDeleteApproval = await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockUserTwo.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
        note: 'change x, y, z',
      });
      // Create approved approver
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockUserThree.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'great job',
      });
      // Soft delete needs_action approver
      await ActivityReportApprover.destroy({
        where: { id: toDeleteApproval.id },
        individualHooks: true,
      });
      const foundReport = await activityReportById(report.id);
      // Show both approvers
      expect(foundReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);
      expect(foundReport.approvers.length).toEqual(1);
      expect(foundReport.approvers[0]).toEqual(expect.objectContaining({
        note: 'great job',
        status: APPROVER_STATUSES.APPROVED,
      }));
    });
  });

  describe('activityReports retrieval and sorting', () => {
    let latestReport;
    let firstGrant;

    beforeAll(async () => {
      const topicsOne = ['topic d', 'topic c'];
      const topicsTwo = ['topic b', 'topic a'];
      const firstGrantee = await Grantee.create({ id: GRANTEE_ID_SORTING, name: 'aaaa' });
      firstGrant = await Grant.create({ id: GRANTEE_ID_SORTING, number: 'anumber', granteeId: firstGrantee.id });

      await ActivityReport.create({
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        userId: mockUserTwo.id,
        topics: topicsOne,
      });
      await createOrUpdate({
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        collaborators: [{ id: mockUser.id }],
      });
      await ActivityReport.create({
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        regionId: 2,
      });
      const report = await ActivityReport.create({
        ...submittedReport,
        activityRecipients: [{ grantId: firstGrant.id }],
        calculatedStatus: REPORT_STATUSES.APPROVED,
        topics: topicsTwo,
      });
      await ActivityRecipient.create({
        activityReportId: report.id,
        grantId: firstGrant.id,
      });
      latestReport = await ActivityReport.create({
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        updatedAt: '1900-01-01T12:00:00Z',
      });
    });

    it('retrieves reports with default sort by updatedAt', async () => {
      const { count, rows } = await activityReports({ 'region.in': ['1'], 'reportId.nin': idsToExclude });
      expect(rows.length).toBe(5);
      expect(count).toBeDefined();
      expect(rows[0].id).toBe(latestReport.id);
    });

    it('retrieves reports sorted by author', async () => {
      reportObject.userId = mockUserTwo.id;

      const { rows } = await activityReports({
        sortBy: 'author', sortDir: 'asc', offset: 0, limit: 2, 'region.in': ['1'], 'reportId.nin': idsToExclude,
      });
      expect(rows.length).toBe(2);
      expect(rows[0].author.name).toBe(mockUser.name);
    });

    it('retrieves reports sorted by collaborators', async () => {
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports({
        sortBy: 'collaborators', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1'], 'reportId.nin': idsToExclude,
      });
      expect(rows.length).toBe(5);
      expect(rows[0].collaborators[0].name).toBe(mockUser.name);
    });

    it('retrieves reports sorted by id', async () => {
      await ActivityReport.create({ ...reportObject, regionId: 1 });

      const { rows } = await activityReports({
        sortBy: 'regionId', sortDir: 'desc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nin': idsToExclude,
      });
      expect(rows.length).toBe(6);
      expect(rows[0].regionId).toBe(2);
    });

    it('retrieves reports sorted by activity recipients', async () => {
      const { rows } = await activityReports({
        sortBy: 'activityRecipients', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nin': idsToExclude,
      });
      expect(rows.length).toBe(6);
      expect(rows[0].activityRecipients[0].grantId).toBe(firstGrant.id);
    });

    it('retrieves reports sorted by sorted topics', async () => {
      await ActivityReport.create(reportObject);
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports({
        sortBy: 'topics', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nin': idsToExclude,
      });
      expect(rows.length).toBe(6);
      expect(rows[0].sortedTopics[0]).toBe('topic a');
      expect(rows[0].sortedTopics[1]).toBe('topic b');
      expect(rows[1].sortedTopics[0]).toBe('topic c');
      expect(rows[0].topics[0]).toBe('topic a');
      expect(rows[0].topics[1]).toBe('topic b');
      expect(rows[1].topics[0]).toBe('topic c');
    });
  });

  describe('possibleRecipients', () => {
    it('retrieves correct recipients in region', async () => {
      const region = 19;
      const recipients = await possibleRecipients(region);

      expect(recipients.grants.length).toBe(1);
    });

    it('retrieves no recipients in empty region', async () => {
      const region = 100;
      const recipients = await possibleRecipients(region);

      expect(recipients.grants.length).toBe(0);
    });

    it('retrieves all recipients when not specifying region', async () => {
      const recipients = await possibleRecipients();
      expect(recipients.grants.length).toBe(11);
    });
  });

  describe('getAllDownloadableActivityReports', () => {
    let approvedReport;
    let legacyReport;
    let nonApprovedReport;

    beforeAll(async () => {
      const mockLegacyReport = {
        ...submittedReport,
        imported: { foo: 'bar' },
        legacyId: 'R14-AR-123456',
        regionId: 14,
        calculatedStatus: REPORT_STATUSES.APPROVED,
      };
      const mockReport = {
        ...submittedReport,
        regionId: 14,
        calculatedStatus: REPORT_STATUSES.APPROVED,
      };
      // create two approved
      approvedReport = await ActivityReport.create(mockReport);
      await ActivityReportApprover.create({
        activityReportId: approvedReport.id,
        userId: mockUserTwo.id,
        status: APPROVER_STATUSES.APPROVED,
      });
      await ActivityReport.create(mockReport);
      // create one approved legacy
      legacyReport = await ActivityReport.create(mockLegacyReport);
      // create one submitted
      nonApprovedReport = await ActivityReport.create({
        ...mockReport, calculatedStatus: REPORT_STATUSES.SUBMITTED,
      });
    });

    it('returns all approved reports', async () => {
      const result = await getAllDownloadableActivityReports([14]);
      const { rows } = result;
      const ids = rows.map((row) => row.id);
      expect(ids.length).toEqual(3);
      expect(ids).toContain(approvedReport.id);
      expect(ids).toContain(legacyReport.id);
    });

    it('will return legacy reports', async () => {
      const result = await getAllDownloadableActivityReports([14], {}, true);
      const { rows } = result;
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(legacyReport.id);

      const secondResult = await getDownloadableActivityReportsByIds([14],
        { report: [legacyReport.id] }, true);

      expect(secondResult.rows.length).toEqual(1);
      expect(secondResult.rows[0].id).toEqual(legacyReport.id);
    });

    it('excludes non-approved reports', async () => {
      const result = await getAllDownloadableActivityReports([14]);
      const { rows } = result;
      const ids = rows.map((row) => row.id);
      expect(ids).not.toContain(nonApprovedReport.id);
    });
  });

  describe('getAllDownloadableActivityReportAlerts', () => {
    let report;

    beforeAll(async () => {
      const mockSubmittedReport = {
        ...submittedReport,
        regionId: 14,
        userId: alertsMockUserOne.id,
      };
      const mockNeedsActionReport = {
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        regionId: 14,
        userId: alertsMockUserTwo.id,
      };
      await ActivityReport.create(mockSubmittedReport);
      report = await ActivityReport.create(mockNeedsActionReport);
    });

    it('do not alert for submitted reports', async () => {
      const result = await getAllDownloadableActivityReportAlerts(alertsMockUserOne.id);
      const { rows } = result;
      expect(rows.length).toEqual(0); // fails, rcvd 13
    });
    it('returns all reports that need action', async () => {
      const result = await getAllDownloadableActivityReportAlerts(alertsMockUserTwo.id);
      const { rows } = result;
      const ids = rows.map((row) => row.id);

      expect(ids.length).toEqual(1); // fails, rcvd 6
      expect(ids).toContain(report.id);
    });
  });

  describe('getDownloadableActivityReportsByIds', () => {
    it('returns report when passed a single report id', async () => {
      const mockReport = {
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
      };
      const report = await ActivityReport.create(mockReport);
      const result = await getDownloadableActivityReportsByIds([1], { report: report.id });
      const { rows } = result;

      expect(rows.length).toEqual(1);
      expect(rows[0].id).toEqual(report.id);
    });

    it('includes legacy reports', async () => {
      const mockLegacyReport = {
        ...reportObject,
        imported: { foo: 'bar' },
        legacyId: 'R14-AR-abc123',
        calculatedStatus: REPORT_STATUSES.APPROVED,
      };
      const legacyReport = await ActivityReport.create(mockLegacyReport);

      const mockReport = {
        ...submittedReport,
      };
      const report = await ActivityReport.create(mockReport);

      const result = await getDownloadableActivityReportsByIds([1],
        { report: [report.id, legacyReport.id] });

      const { rows } = result;

      expect(rows.length).toEqual(2);
      expect(rows.map((row) => row.id)).toContain(legacyReport.id);
    });

    it('ignores invalid report ids', async () => {
      const mockReport = {
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
      };
      const report = await ActivityReport.create(mockReport);

      const result = await getDownloadableActivityReportsByIds([1],
        { report: [report.id, 'invalidIdentifier'] });
      const { rows } = result;

      expect(rows.length).toEqual(1);
      expect(rows[0].id).toEqual(report.id);
    });
  });
  describe('setStatus', () => {
    it('sets report to draft', async () => {
      const report = await ActivityReport.create(submittedReport);
      expect(report.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
      await setStatus(report, REPORT_STATUSES.DRAFT);
      // get report again so we're checking that the change is persisted to the database
      const updatedReport = await ActivityReport.findOne({ where: { id: report.id } });
      expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
    });
  });
});
