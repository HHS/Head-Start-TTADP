import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant, NextStep,
} from '../models';
import {
  createOrUpdate, activityReportById,
} from './activityReports';
import { REPORT_STATUSES } from '../constants';

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
  activityRecipients: [{ activityRecipientId: 100 }],
};

describe('Activity Reports DB service', () => {
  let grantee;

  beforeAll(async () => {
    await User.create(mockUser);
    grantee = await Grantee.create({ id: 100, name: 'grantee' });
    await Grant.create({ id: 100, number: 1, granteeId: grantee.id });
    await NonGrantee.create({ id: 100, name: 'nonGrantee' });
  });

  afterAll(async () => {
    await ActivityRecipient.destroy({ where: {} });
    await ActivityReport.destroy({ where: {} });
    await User.destroy({ where: { id: mockUser.id } });
    await NonGrantee.destroy({ where: { id: 100 } });
    await Grant.destroy({ where: { id: 100 } });
    await Grantee.destroy({ where: { id: 100 } });
    await NextStep.destroy({ where: {} });
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
      expect(report.activityRecipients[0].grant.id).toBe(100);
    });

    it('creates a new report with non-grantee recipient', async () => {
      const report = await createOrUpdate({ ...reportObject, activityRecipientType: 'non-grantee' });
      expect(report.activityRecipients[0].nonGrantee.id).toBe(100);
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
        specialistNotes: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNotes: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      // When that report is created
      const report = await createOrUpdate(reportObjectWithNotes);

      // Then we see that it was saved correctly
      expect(report.specialistNotes.length).toBe(2);
      expect(report.granteeNotes.length).toBe(2);
      expect(report.specialistNotes.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
      expect(report.granteeNotes.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
    });

    it('handles specialist notes being created', async () => {
      // Given a report with specliasts notes
      // And no grantee notes
      const reportWithNotes = {
        ...reportObject,
        specialistNotes: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNotes: [],
      };

      // When that report is created
      const report = await createOrUpdate(reportWithNotes);

      // Then we see that it was saved correctly
      expect(report.granteeNotes.length).toBe(0);
      expect(report.specialistNotes.length).toBe(2);
      expect(report.specialistNotes.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
    });

    it('handles grantee notes being created', async () => {
      // Given a report with grantee notes
      // And not specialist notes
      const reportWithNotes = {
        ...reportObject,
        specialistNotes: [],
        granteeNotes: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };

      // When that report is created
      const report = await createOrUpdate(reportWithNotes);

      // Then we see that it was saved correctly
      expect(report.specialistNotes.length).toBe(0);
      expect(report.granteeNotes.length).toBe(2);
      expect(report.granteeNotes.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
    });

    it('handles specialist notes being updated', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNotes: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNotes: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await ActivityReport.create(reportWithNotes);

      // When the report is updated with new set of specialist notes
      const notes = { specialistNotes: [{ note: 'harry' }, { note: 'spongebob' }] };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see it was updated correctly
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.specialistNotes.map((n) => n.note))
        .toEqual(expect.arrayContaining(['harry', 'spongebob']));
    });

    it('handles grantee notes being updated', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNotes: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNotes: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await ActivityReport.create(reportWithNotes);

      // When the report is updated with new set of grantee notes
      const notes = { granteeNotes: [{ note: 'One Piece' }, { note: 'spongebob' }] };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see it was updated correctly
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.granteeNotes.map((n) => n.note))
        .toEqual(expect.arrayContaining(['One Piece', 'spongebob']));
    });

    it('handles notes being updated to empty', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNotes: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNotes: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await ActivityReport.create(reportWithNotes);

      // When the report is updated with empty notes
      const notes = {
        granteeNotes: [],
        specialistNotes: [],
      };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see the report was updated correctly
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.granteeNotes.length).toBe(0);
      expect(updatedReport.specialistNotes.length).toBe(0);
    });

    it('handles notes being the same', async () => {
      // Given a report with some notes
      const reportWithNotes = {
        ...reportObject,
        specialistNotes: [{ note: 'i am groot' }, { note: 'harry' }],
        granteeNotes: [{ note: 'One Piece' }, { note: 'Toy Story' }],
      };
      const report = await createOrUpdate(reportWithNotes);
      const granteeIds = report.granteeNotes.map((note) => note.id);
      const specialistsIds = report.specialistNotes.map((note) => note.id);

      // When the report is updated with same notes
      const notes = {
        specialistNotes: report.specialistNotes,
        granteeNotes: report.granteeNotes,
      };
      const updatedReport = await createOrUpdate(notes, report);

      // Then we see nothing changes
      // And we are re-using the same old ids
      expect(updatedReport.id).toBe(report.id);
      expect(updatedReport.granteeNotes.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
      expect(updatedReport.granteeNotes.map((n) => n.id))
        .toEqual(expect.arrayContaining(granteeIds));

      expect(updatedReport.specialistNotes.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
      expect(updatedReport.specialistNotes.map((n) => n.id))
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
});
