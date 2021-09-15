import dataValidation, { countAndLastUpdated, runSelectQuery } from './dataValidation';
import { sequelize } from '../models';
import { auditLogger } from '../logger';
import { DECIMAL_BASE } from '../constants';

jest.mock('../logger');

describe('dataValidation', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  describe('run basic query', () => {
    it('should return the data in an object', async () => {
      const query = 'SELECT "regionId", "status", count(*) FROM "Grants" GROUP BY "regionId", "status" ORDER BY "regionId", "status"';
      const [
        { regionId: firstRowRegion, status: firstRowStatus, count: firstRowCount },
        { regionId: secondRowRegion, status: secondRowStatus, count: secondRowCount },
      ] = await runSelectQuery(query);

      expect(firstRowRegion).toBe(1);
      expect(firstRowStatus).toBe('Active');
      expect(firstRowCount).toBe('2');
      expect(secondRowRegion).toBe(1);
      expect(secondRowStatus).toBe('Inactive');
      expect(secondRowCount).toBe('1');
    });
  });

  describe('run count and last updated', () => {
    it('should return the count and last updated value for the given table', async () => {
      const {
        updatedAt,
        count,
      } = await countAndLastUpdated('Grants');
      expect(parseInt(count, DECIMAL_BASE)).toBeGreaterThan(0);
      expect(updatedAt).not.toBe('');
    });
  });

  it('should log results to the auditLogger', async () => {
    await dataValidation();
    expect(auditLogger.info).toHaveBeenCalledTimes(10);
  });
});
