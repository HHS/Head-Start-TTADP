import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant, NextStep, Region,
} from '../models';
import {
  createOrUpdate, activityReportById, possibleRecipients, activityReports, activityReportAlerts,
} from './activityReports';
import { REPORT_STATUSES } from '../constants';

const RECIPIENT_ID = 15;

const mockUser = {
  id: 1000,
  homeRegionId: 1,
  name: 'user',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
  activityRecipients: [{ activityRecipientId: RECIPIENT_ID }],
};

describe('Activity Reports DB service', () => {
  let grantee;

  beforeAll(async () => {
    await User.create(mockUser);
    grantee = await Grantee.create({ id: RECIPIENT_ID, name: 'grantee', regionId: 17 });
    await Region.create({ name: 'office 17', id: 17 });
    await Grant.create({
      id: RECIPIENT_ID, number: 1, granteeId: grantee.id, regionId: 17,
    });
    await NonGrantee.create({ id: RECIPIENT_ID, name: 'nonGrantee' });
  });

  afterAll(async () => {
    await NextStep.destroy({ where: {} });
    await ActivityRecipient.destroy({ where: {} });
    await ActivityReport.destroy({ where: {} });
    await User.destroy({ where: { id: mockUser.id } });
    await NonGrantee.destroy({ where: { id: RECIPIENT_ID } });
    await Grant.destroy({ where: { id: RECIPIENT_ID } });
    await Grantee.destroy({ where: { id: RECIPIENT_ID } });
    await Region.destroy({ where: { id: 17 } });
    db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdate', () => {
    it('updates an already saved report', async () => {
      const report = await ActivityReport.create(reportObject);
      const newReport = await createOrUpdate({ resourcesUsed: 'updated' }, report);
      expect(newReport.resourcesUsed).toBe('updated');
    });

    it('creates a new report', async () => {
      const beginningARCount = await ActivityReport.count();
      const report = await createOrUpdate(reportObject);
      const endARCount = await ActivityReport.count();
      expect(endARCount - beginningARCount).toBe(1);
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
      expect(report.collaborators[0].name).toBe('user');
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

  describe('activityReportById', () => {
    it('retrieves an activity report', async () => {
      const report = await ActivityReport.create(reportObject);

      const foundReport = await activityReportById(report.id);
      expect(foundReport.id).toBe(report.id);
      expect(foundReport.resourcesUsed).toBe('test');
    });
  });

  describe('activityReports retrieval and sorting', () => {
    it('retrieves reports with default sort by updatedAt', async () => {
      const report = await ActivityReport.create(reportObject);

      const { count, rows } = await activityReports([1], {});
      expect(rows.length).toBe(10);
      expect(count).toBeDefined();
      expect(rows[0].id).toBe(report.id);
    });

    it('retrieves reports sorted by author', async () => {
      const mockUserTwo = {
        id: 1002,
        homeRegionId: 1,
        name: 'a user',
      };
      await User.findOrCreate({
        where: {
          id: mockUserTwo.id,
        },
        defaults: mockUserTwo,
      });
      reportObject.userId = mockUserTwo.id;
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1], {
        sortBy: 'author', sortDir: 'asc', offset: 0, limit: 2,
      });
      expect(rows.length).toBe(2);
      expect(rows[0].author.name).toBe('a user');
    });

    it('retrieves reports sorted by collaborators', async () => {
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1], {
        sortBy: 'collaborators', sortDir: 'asc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(12);
      expect(rows[0].collaborators[0].name).toBe('user');
    });

    it('retrieves reports sorted by id', async () => {
      reportObject.regionId = 2;
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1, 2], {
        sortBy: 'regionId', sortDir: 'desc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(12);
      expect(rows[0].regionId).toBe(2);
    });

    it('retrieves reports sorted by activity recipients', async () => {
      reportObject.regionId = 2;
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1, 2], {
        sortBy: 'activityRecipients', sortDir: 'asc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(12);
      expect(rows[0].activityRecipients[0].activityRecipientId).toBe(RECIPIENT_ID);
    });

    it('retrieves reports sorted by sorted topics', async () => {
      reportObject.topics = ['topic d', 'topic c'];
      await ActivityReport.create(reportObject);
      reportObject.topics = ['topic b', 'topic a'];
      await ActivityReport.create(reportObject);

      const { rows } = await activityReports([1, 2], {
        sortBy: 'topics', sortDir: 'asc', offset: 0, limit: 12,
      });
      expect(rows.length).toBe(12);
      expect(rows[0].sortedTopics[0]).toBe('topic a');
      expect(rows[0].sortedTopics[1]).toBe('topic b');
      expect(rows[1].sortedTopics[0]).toBe('topic c');
      expect(rows[0].topics[0]).toBe('topic a');
      expect(rows[0].topics[1]).toBe('topic b');
      expect(rows[1].topics[0]).toBe('topic c');
    });

    it('retrieves myalerts', async () => {
      const mockUserTwo = {
        id: 1002,
        homeRegionId: 1,
        name: 'a user',
      };
      await User.findOrCreate({
        where: {
          id: mockUserTwo.id,
        },
        defaults: mockUserTwo,
      });
      reportObject.userId = mockUserTwo.id;
      await ActivityReport.create(reportObject);

      const result = await activityReportAlerts(mockUserTwo.id);
      expect(result[0].userId).toBe(mockUserTwo.id);
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
      // 11 From db being seeded + 1 that we create for this test suite = 12
      expect(recipients.grants.length).toBe(12);
    });
  });
});
