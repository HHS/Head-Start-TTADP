import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import dataValidation, { countAndLastUpdated, runSelectQuery } from './dataValidation';
import {
  Grant,
  Recipient,
  sequelize,
} from '../models';
import { auditLogger } from '../logger';
import { DECIMAL_BASE } from '../constants';

jest.mock('../logger');

describe('dataValidation', () => {
  beforeAll(async () => {
    const recipientOne = await Recipient.create({
      id: 1,
      name: 'recipient1',
      uei: 'uei1',
    });
    const recipientTwo = await Recipient.create({
      id: 2,
      name: 'recipient2',
      uei: 'uei2',
    });
    const recipientThree = await Recipient.create({
      id: 3,
      name: 'recipient3',
      uei: 'uei3',
    });

    await Grant.create({
      id: 1,
      number: faker.datatype.number({ min: 90000 }),
      regionId: 1,
      status: 'Active',
      recipientId: recipientOne.id,
    });
    await Grant.create({
      id: 2,
      number: faker.datatype.number({ min: 90000 }),
      regionId: 1,
      status: 'Inactive',
      recipientId: recipientTwo.id,
    });
    await Grant.create({
      id: 3,
      number: faker.datatype.number({ min: 90000 }),
      regionId: 1,
      status: 'Inactive',
      recipientId: recipientThree.id,
    });
  });

  afterAll(async () => {
    await Grant.destroy({ where: { id: { [Op.in]: [1, 2, 3] } } });
    await Recipient.destroy({ where: { id: { [Op.in]: [1, 2, 3] } } });
    await sequelize.close();
  });

  describe('run basic query', () => {
    it('should return the data in an object', async () => {
      const query = `
        SELECT
          "regionId",
          "status",
          count(*)
        FROM "Grants"
        WHERE "recipientId" in (1, 2, 3)
        GROUP BY "regionId", "status"
        ORDER BY "regionId", "status"`;
      const [
        { regionId: firstRowRegion, status: firstRowStatus, count: firstRowCount },
        { regionId: secondRowRegion, status: secondRowStatus, count: secondRowCount },
      ] = await runSelectQuery(query);

      expect(firstRowRegion).toBe(1);
      expect(firstRowStatus).toBe('Active');
      expect(firstRowCount).toBe('1');
      expect(secondRowRegion).toBe(1);
      expect(secondRowStatus).toBe('Inactive');
      expect(secondRowCount).toBe('2');
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
