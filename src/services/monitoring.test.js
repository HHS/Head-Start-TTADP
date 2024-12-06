import {
  classScore,
  monitoringData,
} from './monitoring';
import { createMonitoringData, destroyMonitoringData } from './monitoring.testHelpers';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
} = db;

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;

describe('monitoring services', () => {
  beforeAll(async () => {
    await Grant.findOrCreate({
      where: { number: GRANT_NUMBER },
      defaults: {
        id: GRANT_ID,
        regionId: REGION_ID,
        number: GRANT_NUMBER,
        recipientId: RECIPIENT_ID,
        status: 'Active',
        startDate: '2024-02-12 14:31:55.74-08',
        endDate: '2024-02-12 14:31:55.74-08',
        cdi: false,
      },
    });
  });

  afterAll(async () => {
    await Grant.destroy({ where: { number: GRANT_NUMBER }, force: true, individualHooks: true });
    await db.sequelize.close();
  });

  describe('classScore', () => {
    beforeAll(async () => {
      await createMonitoringData(GRANT_NUMBER);
    });
    afterAll(async () => {
      await destroyMonitoringData(GRANT_NUMBER);
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    });
    it('returns data in the correct format', async () => {
      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
        received: expect.any(String),
        ES: expect.any(String),
        CO: expect.any(String),
        IS: expect.any(String),
      });
    });
  });
  describe('monitoringData', () => {
    beforeAll(async () => {
      await createMonitoringData(GRANT_NUMBER);
    });
    afterAll(async () => {
      await destroyMonitoringData(GRANT_NUMBER);
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    });
    it('returns null when nothing is found', async () => {
      const recipientId = 7;
      const regionId = 12;
      const grantNumber = '09CH0333343';

      const data = await monitoringData({
        recipientId,
        regionId,
        grantNumber,
      });

      expect(data).toEqual(null);
    });

    it('returns data in the correct format', async () => {
      const recipientId = RECIPIENT_ID;
      const regionId = REGION_ID;
      const grantNumber = GRANT_NUMBER;

      const grant = await Grant.findOne({
        where: { id: GRANT_ID },
      });

      expect(grant).not.toBeNull();

      const grantNumberLink = await GrantNumberLink.findOne({
        where: { grantId: GRANT_ID },
      });

      expect(grantNumberLink).not.toBeNull();

      const data = await monitoringData({
        recipientId,
        regionId,
        grantNumber,
      });

      expect(data).toEqual({
        recipientId,
        regionId,
        grant: grantNumber,
        reviewStatus: 'Complete',
        reviewDate: '02/22/2023',
        reviewType: 'FA-1',
      });
    });
  });
  describe('Grant afterCreate', () => {
    beforeAll(async () => {
      await Grant.findOrCreate({
        where: { number: '14CH123' },
        defaults: {
          id: GRANT_ID + 2,
          regionId: REGION_ID,
          number: '14CH123',
          recipientId: RECIPIENT_ID,
          status: 'Active',
          startDate: '2024-02-12 14:31:55.74-08',
          endDate: '2024-02-12 14:31:55.74-08',
          cdi: false,
        },
      });
    });

    afterAll(async () => {
      await GrantNumberLink.destroy({ where: { grantNumber: '14CH123' }, force: true });
      await Grant.destroy({ where: { number: '14CH123' }, force: true, individualHooks: true });
    });

    it('adds a record in GrantNumberLink table', async () => {
      const createdGrant = await Grant.findOne({
        where: { id: GRANT_ID + 2 },
      });
      expect(createdGrant).not.toBeNull();

      const createdGrantNumberLink = await GrantNumberLink.findOne({
        where: { grantNumber: '14CH123' },
      });

      expect(createdGrantNumberLink).not.toBeNull();
      expect(createdGrantNumberLink.grantNumber).toEqual('14CH123');
      expect(createdGrantNumberLink.grantId).toEqual(GRANT_ID + 2);
    });
  });
});
