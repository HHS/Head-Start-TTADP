import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant, NextStep, Region,
} from '../models';
import {
  createOrUpdate,
  activityReportById,
  possibleRecipients,
  review,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
} from './activityReports';
import { copyGoalsToGrants } from './goals';
import { REPORT_STATUSES } from '../constants';

jest.mock('./goals', () => ({
  copyGoalsToGrants: jest.fn(),
}));

const RECIPIENT_ID = 15;
const GRANTEE_ID = 16;

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

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: RECIPIENT_ID }],
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
  let grantee;

  beforeAll(async () => {
    await User.create(mockUser);
    grantee = await Grantee.create({ id: RECIPIENT_ID, name: 'grantee', regionId: 17 });
    await Region.create({ name: 'office 17', id: 17 });
    await Grant.create({
      id: RECIPIENT_ID, number: 1, granteeId: grantee.id, regionId: 17, status: 'Active',
    });
    await NonGrantee.create({ id: RECIPIENT_ID, name: 'nonGrantee' });
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id, mockUserTwo.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id, mockUserTwo.id] } });
    await NonGrantee.destroy({ where: { id: RECIPIENT_ID } });
    await Grant.destroy({ where: { id: [RECIPIENT_ID, GRANTEE_ID] } });
    await Grantee.destroy({ where: { id: [RECIPIENT_ID, GRANTEE_ID] } });
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
      expect(report.activityRecipients[0].grant.id).toBe(RECIPIENT_ID);
    });

    it('creates a new report with non-grantee recipient', async () => {
      const report = await createOrUpdate({ ...reportObject, activityRecipientType: 'non-grantee' });
      expect(report.activityRecipients[0].nonGrantee.id).toBe(RECIPIENT_ID);
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
      const firstGrantee = await Grantee.create({ id: GRANTEE_ID, name: 'aaaa' });
      firstGrant = await Grant.create({ id: GRANTEE_ID, number: 'anumber', granteeId: firstGrantee.id });

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
      const { count, rows } = await activityReports([1], {});
      expect(rows.length).toBe(6);
      expect(count).toBeDefined();
      expect(rows[0].id).toBe(latestReport.id);
    });

    it('retrieves reports sorted by author', async () => {
      reportObject.userId = mockUserTwo.id;

      const { rows } = await activityReports([1], {
        sortBy: 'author', sortDir: 'asc', offset: 0, limit: 2,
      });
      expect(rows.length).toBe(2);
      expect(rows[0].author.name).toBe('user1002');
    });

    it('retrieves reports sorted by collaborators', async () => {
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1], {
        sortBy: 'collaborators', sortDir: 'asc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(6);
      expect(rows[0].collaborators[0].name).toBe('user1000');
    });

    it('retrieves reports sorted by id', async () => {
      reportObject.regionId = 2;
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1, 2], {
        sortBy: 'regionId', sortDir: 'desc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(7);
      expect(rows[0].regionId).toBe(2);
    });

    it('retrieves reports sorted by activity recipients', async () => {
      const { rows } = await activityReports([1, 2], {
        sortBy: 'activityRecipients', sortDir: 'asc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(7);
      expect(rows[0].activityRecipients[0].grantId).toBe(firstGrant.id);
    });

    it('retrieves reports sorted by sorted topics', async () => {
      await ActivityReport.create(reportObject);
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1, 2], {
        sortBy: 'topics', sortDir: 'asc', offset: 0, limit: 12,
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
});
