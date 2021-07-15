import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant, NextStep, Region, Permission,
} from '../models';
import {
  createOrUpdate,
  activityReportById,
  possibleRecipients,
  review,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReports,
  getAllDownloadableActivityReportAlerts,
} from './activityReports';
import { copyGoalsToGrants } from './goals';
import SCOPES from '../middleware/scopeConstants';
import { REPORT_STATUSES } from '../constants';

jest.mock('./goals', () => ({
  copyGoalsToGrants: jest.fn(),
}));

const GRANTEE_ID = 30;
const GRANTEE_ID_SORTING = 31;

const mockUser = {
  id: 1000,
  homeRegionId: 1,
  name: 'user1000',
  hsesUsername: 'user1000',
  hsesUserId: '1000',
};

const mockUserTwo = {
  id: 1002,
  homeRegionId: 1,
  name: 'user1002',
  hsesUserId: 1002,
  hsesUsername: 'Rex',
};

const mockUserThree = {
  id: 1003,
  homeRegionId: 1,
  name: 'user1003',
  hsesUserId: 1003,
  hsesUsername: 'Tex',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: GRANTEE_ID }],
};

const submittedReport = {
  ...reportObject,
  activityRecipients: [{ grantId: 1 }],
  status: REPORT_STATUSES.SUBMITTED,
  approvingManagerId: 1,
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

describe('Activity Reports DB service', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });
    await Region.create({ name: 'office 17', id: 17 });
    await Grant.create({
      id: GRANTEE_ID, number: 1, granteeId: GRANTEE_ID, regionId: 17, status: 'Active',
    });
    await NonGrantee.create({ id: GRANTEE_ID, name: 'nonGrantee' });
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id, mockUserTwo.id] } });
    await Permission.destroy({ where: { userId: mockUserTwo.id } });
    await NonGrantee.destroy({ where: { id: GRANTEE_ID } });
    await Grant.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_SORTING] } });
    await Grantee.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_SORTING] } });
    await Region.destroy({ where: { id: 17 } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('review', () => {
    it('can set the report as needs action', async () => {
      const report = await ActivityReport.create(submittedReport);
      const savedReport = await review(report, REPORT_STATUSES.NEEDS_ACTION, 'notes');
      expect(savedReport.status).toEqual(REPORT_STATUSES.NEEDS_ACTION);
    });

    describe('when setting the report to approved', () => {
      it('does not copy goals if the report is for non-grantees', async () => {
        const report = await ActivityReport.create({ ...submittedReport, activityRecipientType: 'non-grantee' });
        const savedReport = await review(report, REPORT_STATUSES.APPROVED, 'notes');
        expect(savedReport.status).toEqual(REPORT_STATUSES.APPROVED);
        expect(copyGoalsToGrants).not.toHaveBeenCalled();
      });

      it('copies goals if the report is for grantees', async () => {
        const report = await ActivityReport.create(submittedReport, { include: [{ model: ActivityRecipient, as: 'activityRecipients' }] });
        const savedReport = await review(report, REPORT_STATUSES.APPROVED, 'notes');
        expect(savedReport.status).toEqual(REPORT_STATUSES.APPROVED);
        expect(copyGoalsToGrants).toHaveBeenCalled();
      });
    });
  });

  describe('createOrUpdate', () => {
    it('updates an already saved report', async () => {
      const report = await ActivityReport.create(reportObject);
      const newReport = await createOrUpdate({ ECLKCResourcesUsed: [{ value: 'updated' }] }, report);
      expect(newReport.ECLKCResourcesUsed).toEqual(['updated']);
    });

    it('creates a new report', async () => {
      const beginningARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } });
      const report = await createOrUpdate(reportObject);
      const endARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } });
      expect(endARCount.length - beginningARCount.length).toBe(1);
      expect(report.activityRecipients[0].grant.id).toBe(GRANTEE_ID);
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
      expect(report.collaborators[0].name).toBe('user1000');
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
  });

  describe('activityReports retrieval and sorting', () => {
    let latestReport;
    let firstGrant;

    beforeAll(async () => {
      const topicsOne = ['topic d', 'topic c'];
      const topicsTwo = ['topic b', 'topic a'];
      const firstGrantee = await Grantee.create({ id: GRANTEE_ID_SORTING, name: 'aaaa' });
      firstGrant = await Grant.create({ id: GRANTEE_ID_SORTING, number: 'anumber', granteeId: firstGrantee.id });

      await User.findOrCreate({
        where: {
          id: mockUserTwo.id,
        },
        defaults: mockUserTwo,
      });
      await ActivityReport.create({
        ...submittedReport,
        status: REPORT_STATUSES.APPROVED,
        userId: mockUserTwo.id,
        topics: topicsOne,
      });
      await createOrUpdate({
        ...submittedReport,
        status: REPORT_STATUSES.APPROVED,
        collaborators: [{ id: mockUser.id }],
      });
      await ActivityReport.create({
        ...submittedReport,
        status: REPORT_STATUSES.APPROVED,
        regionId: 2,
      });
      const report = await ActivityReport.create({
        ...submittedReport,
        activityRecipients: [{ grantId: firstGrant.id }],
        status: REPORT_STATUSES.APPROVED,
        topics: topicsTwo,
      });
      await ActivityRecipient.create({
        activityReportId: report.id,
        grantId: firstGrant.id,
      });
      latestReport = await ActivityReport.create({
        ...submittedReport,
        status: REPORT_STATUSES.APPROVED,
        updatedAt: '1900-01-01T12:00:00Z',
      });
    });

    it('retrieves reports with default sort by updatedAt', async () => {
      const { count, rows } = await activityReports({ 'region.in': ['1'] });
      expect(rows.length).toBe(6);
      expect(count).toBeDefined();
      expect(rows[0].id).toBe(latestReport.id);
    });

    it('retrieves reports sorted by author', async () => {
      reportObject.userId = mockUserTwo.id;

      const { rows } = await activityReports({
        sortBy: 'author', sortDir: 'asc', offset: 0, limit: 2, 'region.in': ['1'],
      });
      expect(rows.length).toBe(2);
      expect(rows[0].author.name).toBe('user1000');
    });

    it('retrieves reports sorted by collaborators', async () => {
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports({
        sortBy: 'collaborators', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1'],
      });
      expect(rows.length).toBe(6);
      expect(rows[0].collaborators[0].name).toBe('user1000');
    });

    it('retrieves reports sorted by id', async () => {
      reportObject.regionId = 2;
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports({
        sortBy: 'regionId', sortDir: 'desc', offset: 0, limit: 12, 'region.in': ['1', '2'],
      });
      expect(rows.length).toBe(7);
      expect(rows[0].regionId).toBe(2);
    });

    it('retrieves reports sorted by activity recipients', async () => {
      const { rows } = await activityReports({
        sortBy: 'activityRecipients', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'],
      });
      expect(rows.length).toBe(7);
      expect(rows[0].activityRecipients[0].grantId).toBe(firstGrant.id);
    });

    it('retrieves reports sorted by sorted topics', async () => {
      await ActivityReport.create(reportObject);
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports({
        sortBy: 'topics', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'],
      });
      expect(rows.length).toBe(7);
      expect(rows[0].sortedTopics[0]).toBe('topic a');
      expect(rows[0].sortedTopics[1]).toBe('topic b');
      expect(rows[1].sortedTopics[0]).toBe('topic c');
      expect(rows[0].topics[0]).toBe('topic a');
      expect(rows[0].topics[1]).toBe('topic b');
      expect(rows[1].topics[0]).toBe('topic c');
    });

    it('retrieves myalerts', async () => {
      await User.findOrCreate({
        where: {
          id: mockUserTwo.id,
        },
        defaults: mockUserTwo,
      });

      reportObject.userId = mockUserTwo.id;
      await ActivityReport.create(reportObject);

      await Permission.create({
        userId: mockUserTwo.id,
        regionId: 1,
        scopeId: SCOPES.READ_REPORTS,
      });

      await Permission.create({
        userId: mockUserTwo.id,
        regionId: 2,
        scopeId: SCOPES.READ_REPORTS,
      });

      const { count, rows } = await activityReportAlerts(mockUserTwo.id, {});
      expect(count).toBe(5);
      expect(rows.length).toBe(5);
      expect(rows[0].userId).toBe(mockUserTwo.id);
    });
  });

  describe('possibleRecipients', () => {
    it('retrieves correct recipients in region', async () => {
      const region = 17;
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
    let report;
    let legacyReport;
    let approvedReport;

    beforeAll(async () => {
      await User.findOrCreate({
        where: {
          id: mockUser.id,
        },
        defaults: mockUser,
      });
      const mockLegacyReport = {
        ...submittedReport,
        imported: { foo: 'bar' },
        legacyId: 'R14-AR-123456',
        regionId: 14,
        status: REPORT_STATUSES.APPROVED,
      };
      const mockReport = {
        ...submittedReport,
        regionId: 14,
        status: REPORT_STATUSES.APPROVED,
      };
      report = await ActivityReport.create(mockReport);
      await ActivityReport.create(mockReport);
      legacyReport = await ActivityReport.create(mockLegacyReport);
      approvedReport = await ActivityReport.create({
        ...mockReport, status: REPORT_STATUSES.SUBMITTED,
      });
    });

    it('returns all approved reports', async () => {
      const result = await getAllDownloadableActivityReports([14]);
      const { rows } = result;
      const ids = rows.map((row) => row.id);

      expect(ids.length).toEqual(2);
      expect(ids).toContain(report.id);
    });

    it('excludes legacy reports', async () => {
      const result = await getAllDownloadableActivityReports([14]);
      const { rows } = result;
      const ids = rows.map((row) => row.id);
      expect(ids).not.toContain(legacyReport.id);
    });

    it('excludes non-approved reports', async () => {
      const result = await getAllDownloadableActivityReports([14]);
      const { rows } = result;
      const ids = rows.map((row) => row.id);
      expect(ids).not.toContain(approvedReport.id);
    });
  });

  describe('getAllDownloadableActivityReportAlerts', () => {
    let report;

    beforeAll(async () => {
      await User.findOrCreate({
        where: {
          id: mockUserThree.id,
        },
        defaults: mockUserThree,
      });
      const mockReport = {
        ...submittedReport,
        regionId: 14,
        userId: mockUserThree.id,
      };
      report = await ActivityReport.create(mockReport);
      await ActivityReport.create(mockReport);
    });

    it('returns all reports', async () => {
      const result = await getAllDownloadableActivityReportAlerts(mockUserThree.id);
      const { rows } = result;
      const ids = rows.map((row) => row.id);

      expect(ids.length).toEqual(2);
      expect(ids).toContain(report.id);
    });
  });

  describe('getDownloadableActivityReportsByIds', () => {
    beforeAll(async () => {
      await User.findOrCreate({
        where: {
          id: mockUser.id,
        },
        defaults: mockUser,
      });
      await User.findOrCreate({
        where: {
          id: mockUserTwo.id,
        },
        defaults: mockUserTwo,
      });
    });

    it('returns report when passed a single report id', async () => {
      const mockReport = {
        ...submittedReport,
      };
      const report = await ActivityReport.create(mockReport);
      const result = await getDownloadableActivityReportsByIds([1], { report: report.id });
      const { rows } = result;

      expect(rows.length).toEqual(1);
      expect(rows[0].id).toEqual(report.id);
    });

    it('excludes legacy reports', async () => {
      const mockLegacyReport = {
        ...reportObject,
        imported: { foo: 'bar' },
        legacyId: 'R14-AR-abc123',
      };
      const legacyReport = await ActivityReport.create(mockLegacyReport);

      const mockReport = {
        ...submittedReport,
      };
      const report = await ActivityReport.create(mockReport);

      const result = await getDownloadableActivityReportsByIds([1],
        { report: [report.id, legacyReport.id] });
      const { rows } = result;

      expect(rows.length).toEqual(1);
      expect(rows[0].id).not.toEqual(legacyReport.id);
    });

    it('ignores invalid report ids', async () => {
      const mockReport = {
        ...submittedReport,
      };
      const report = await ActivityReport.create(mockReport);

      const result = await getDownloadableActivityReportsByIds([1],
        { report: [report.id, 'invalidIdentifier'] });
      const { rows } = result;

      expect(rows.length).toEqual(1);
      expect(rows[0].id).toEqual(report.id);
    });
  });
});
