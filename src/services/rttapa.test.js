import db from '../models';
import {
  newRttapa,
  rttapa,
  allRttapas,
} from './rttapa';

describe('rttapa service', () => {
  let reportId;

  afterAll(async () => {
    await db.RttapaPilot.destroy({ where: { id: reportId } });
    await db.sequelize.close();
  });

  describe('newRttapa', () => {
    it('includes the correct fields', async () => {
      const report = await newRttapa(1, {
        regionId: 14,
        recipientId: 1,
        goalIds: [1, 2, 3],
        notes: '',
        reviewDate: '2021-01-01',
      });

      reportId = report.id;

      expect(report).toHaveProperty('regionId');
      expect(report).toHaveProperty('recipientId');
      expect(report).toHaveProperty('goals');
      expect(report).toHaveProperty('notes');
      expect(report).toHaveProperty('reviewDate');
    });
  });

  describe('rttapa', () => {
    it('includes the correct fields', async () => {
      const report = await rttapa(1);

      expect(report).toHaveProperty('regionId');
      expect(report).toHaveProperty('recipientId');
      expect(report).toHaveProperty('goals');
      expect(report).toHaveProperty('notes');
      expect(report).toHaveProperty('reviewDate');
    });
  });

  describe('allRttapas', () => {
    it('includes the correct fields', async () => {
      const reports = await allRttapas(1, 1, { sortBy: 'reviewDate', direction: 'desc' });

      reports.forEach((report) => {
        expect(report).toHaveProperty('regionId');
        expect(report).toHaveProperty('recipientId');
        expect(report).toHaveProperty('goals');
        expect(report).toHaveProperty('notes');
        expect(report).toHaveProperty('reviewDate');
      });
    });
  });
});
