import {
  newRttapa,
  rttapa,
  allRttapas,
} from './rttapa';

describe('rttapa service', () => {
  describe('newRttapa', () => {
    it('includes the correct fields', async () => {
      const report = await newRttapa({
        regionId: 1,
        recipientId: 1,
        goals: [],
        notes: '',
      });

      expect(report).toHaveProperty('regionId');
      expect(report).toHaveProperty('recipientId');
      expect(report).toHaveProperty('goals');
      expect(report).toHaveProperty('notes');
    });
  });

  describe('rttapa', () => {
    it('includes the correct fields', async () => {
      const report = await rttapa(1);

      expect(report).toHaveProperty('regionId');
      expect(report).toHaveProperty('recipientId');
      expect(report).toHaveProperty('goals');
      expect(report).toHaveProperty('notes');
    });
  });

  describe('allRttapas', () => {
    it('includes the correct fields', async () => {
      const reports = await allRttapas();

      reports.forEach((report) => {
        expect(report).toHaveProperty('regionId');
        expect(report).toHaveProperty('recipientId');
        expect(report).toHaveProperty('goals');
        expect(report).toHaveProperty('notes');
      });
    });
  });
});
