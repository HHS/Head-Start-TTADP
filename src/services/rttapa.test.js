import {
  newRttapa,
  rttapa,
  allRttapas,
} from './rttapa';

describe('rttapa service', () => {
  describe('newRttapa', () => {
    it('includes the correct fields', async () => {
      const report = await newRttapa(1, {
        regionId: 14,
        recipientId: 1,
        goalIds: [1, 2, 3],
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
      const reports = await allRttapas(1, 1);

      reports.forEach((report) => {
        expect(report).toHaveProperty('regionId');
        expect(report).toHaveProperty('recipientId');
        expect(report).toHaveProperty('goals');
        expect(report).toHaveProperty('notes');
      });
    });
  });
});
