import db from '../models';
import {
  createRttapa,
  findRttapa,
  findAllRttapa,
} from './rttapa';

describe('rttapa service', () => {
  let reportId;

  afterAll(async () => {
    await db.RttapaPilot.destroy({ where: { id: reportId.id } });
    await db.sequelize.close();
  });

  describe('newRttapa', () => {
    it('includes the correct fields', async () => {
      const report = await createRttapa(1, {
        regionId: 14,
        recipientId: 1,
        goalIds: [1, 2, 3],
        notes: '',
        reviewDate: '2021-01-01',
      });

      reportId = await findRttapa(report.id);

      expect(report).toHaveProperty('regionId');
      expect(report).toHaveProperty('recipientId');
      expect(report).toHaveProperty('goals');
      expect(report).toHaveProperty('notes');
      expect(report).toHaveProperty('reviewDate');
    });
  });

  describe('rttapa', () => {
    it('includes the correct fields', async () => {
      const report = await findRttapa(1);

      expect(report).toHaveProperty('regionId');
      expect(report).toHaveProperty('recipientId');
      expect(report).toHaveProperty('goals');
      expect(report).toHaveProperty('notes');
      expect(report).toHaveProperty('reviewDate');
    });
  });

  describe('allRttapas', () => {
    it('includes the correct fields', async () => {
      const reports = await findAllRttapa(1, 1);

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
