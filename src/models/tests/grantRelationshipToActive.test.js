/* eslint-disable max-len */
import db, { Grant, GrantRelationshipToActive, Recipient } from '..';

const mockGrant = {
  id: 89898,
  number: '89CH8989',
  regionId: 2,
  status: 'Active',
  startDate: new Date('2021-02-09T15:13:00.000Z'),
  endDate: new Date('2021-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
};

const mockRecipient = {
  id: 89898,
  uei: 'NNA5N2KHMGM2',
  name: 'Tooth Brushing Academy',
  recipientType: 'Community Action Agency (CAA)',
};

describe('GrantRelationshipToActive', () => {
  let grant;
  let recipient;
  let instance;

  beforeAll(async () => {
    recipient = await Recipient.create({ ...mockRecipient });
    grant = await Grant.create({ ...mockGrant, recipientId: recipient.id }, { individualHooks: true });
  });

  afterAll(async () => {
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await db.sequelize.close();
  });

  it('automatically refreshes when the grant is created', async () => {
    instance = await GrantRelationshipToActive.findOne({ where: { grantId: grant.id } });
    expect(instance).toBeTruthy();
  });

  it('refreshes when the grant status changes', async () => {
    await grant.update({ status: 'Inactive' }, { individualHooks: true });
    instance = await GrantRelationshipToActive.findOne({ where: { grantId: grant.id } });
    expect(instance).toBeFalsy();
  });

  describe('error cases', () => {
    beforeAll(async () => {
      // Set the status of the grant back to active so that we can test behavior of an instance.
      await grant.update({ status: 'Active' }, { individualHooks: true });
    });
    it('throws an error on create', async () => {
      await expect(GrantRelationshipToActive.create({ grantId: grant.id }))
        .rejects
        .toThrow('Insertion not allowed on materialized view');
    });

    it('throws an error on update', async () => {
      instance = await GrantRelationshipToActive.findOne({ where: { grantId: grant.id } });
      await expect(instance.update({ activeGrantId: 12345 }))
        .rejects
        .toThrow('Update not allowed on materialized view');
    });

    it('throws an error on destroy', async () => {
      instance = await GrantRelationshipToActive.findOne({ where: { grantId: grant.id } });
      await expect(instance.destroy())
        .rejects
        .toThrow('Deletion not allowed on materialized view');
    });
  });

  describe('refresh', () => {
    let originalEnv;

    beforeAll(() => {
      originalEnv = process.env;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('throws if it fails', async () => {
      const originalQuery = db.sequelize.query;
      db.sequelize.query = jest.fn().mockRejectedValue(new Error('Refresh failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(GrantRelationshipToActive.refresh())
        .rejects
        .toThrow('Refresh failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error refreshing materialized view:', expect.any(Error));
      db.sequelize.query = originalQuery;
      consoleErrorSpy.mockRestore();
    });

    it('refreshes the materialized view and logs to console when !SUPPRESS_SUCCESS_MESSAGE', async () => {
      process.env = { ...originalEnv, SUPPRESS_SUCCESS_MESSAGE: 'false' };
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await GrantRelationshipToActive.refresh();
      expect(consoleLogSpy).toHaveBeenCalledWith('Materialized view refreshed successfully');
      consoleLogSpy.mockRestore();
    });

    it('refreshes the materialized view and does not log to console when SUPPRESS_SUCCESS_MESSAGE', async () => {
      process.env = { ...originalEnv, SUPPRESS_SUCCESS_MESSAGE: 'true' };
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await GrantRelationshipToActive.refresh();
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });
});
