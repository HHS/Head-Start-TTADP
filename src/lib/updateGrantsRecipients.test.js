import { Op, QueryTypes } from 'sequelize';
import axios from 'axios';
import fs from 'mz/fs';
import updateGrantsRecipients, { processFiles } from './updateGrantsRecipients';
import db, {
  sequelize, Recipient, Grant, Program, ZALGrant, ActivityRecipient,
} from '../models';

jest.mock('axios');
const mockZip = jest.fn();
jest.mock('adm-zip', () => jest.fn().mockImplementation(() => ({ extractAllTo: mockZip })));
jest.mock('./fileUtils', () => ({
  fileHash: () => 'hash',
}));

const SMALLEST_GRANT_ID = 1000;

describe('Update HSES data', () => {
  beforeEach(() => {
    const response = {
      status: 200,
      data: { pipe: jest.fn() },
    };
    axios.mockResolvedValue(response);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('retrieves a zip file and extracts it to temp', async () => {
    const on = jest.fn()
      .mockImplementation((event, cb) => {
        if (event === 'close') {
          cb();
        }
      });
    const writeStream = jest.spyOn(fs, 'createWriteStream');
    writeStream.mockReturnValue({ on });

    const processFunc = jest.fn();
    await updateGrantsRecipients(processFunc);

    expect(mockZip).toHaveBeenCalled();
    expect(processFunc).toHaveBeenCalled();
  });

  it('exits early on a writeStream error', async () => {
    const on = jest.fn()
      .mockImplementation((event, cb) => {
        if (event === 'error') {
          cb();
        }
      });
    const writeStream = jest.spyOn(fs, 'createWriteStream');
    writeStream.mockReturnValue({ on });

    const processFunc = jest.fn();
    await expect(updateGrantsRecipients(processFunc)).rejects.not.toThrow();

    expect(mockZip).not.toHaveBeenCalled();
    expect(processFunc).not.toHaveBeenCalled();
  });
});

describe('Update grants and recipients', () => {
  beforeAll(async () => {
    await Program.destroy({ where: { id: [1, 2, 3, 4] } });
    await ActivityRecipient.destroy({ where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Grant.destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Recipient.destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
  });
  afterEach(async () => {
    await Program.destroy({ where: { id: [1, 2, 3, 4] } });
    await ActivityRecipient.destroy({ where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Grant.destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Recipient.destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
  });
  afterAll(async () => {
    await db.sequelize.close();
  });
  it('should import or update recipients', async () => {
    const recipientsBefore = await Recipient.findAll(
      { where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } },
    );
    expect(recipientsBefore.length).toBe(0);
    await processFiles();

    const recipient = await Recipient.findOne({ where: { id: 1335 } });
    expect(recipient).toBeDefined();
    expect(recipient.uei).toBe('NNA5N2KHMGN2');
    expect(recipient.name).toBe('Agency 1, Inc.');

    const recipient7709 = await Recipient.findOne({ where: { id: 7709 } });
    expect(recipient7709).toBeDefined();
    expect(recipient7709.uei).toBeNull();

    const recipient7782 = await Recipient.findOne({ where: { id: 7782 } });
    expect(recipient7782).toBeDefined();

    const grant1 = await Grant.findOne({ where: { id: 8110 } });
    expect(grant1.oldGrantId).toBe(7842);

    const grant2 = await Grant.findOne({ where: { id: 11835 } });
    expect(grant2.oldGrantId).toBe(2591);
    expect(recipient.recipientType).toBe('Community Action Agency (CAA)');

    const grant3 = await Grant.findOne({ where: { id: 10448 } });
    expect(grant3.oldGrantId).toBe(null);

    const grantForRecipients = await Grant.findAll({ where: { recipientId: 7782 } });
    expect(grantForRecipients.length).toEqual(2);
  });

  it('includes the grants state', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 11630 } });
    // simulate updating an existing grant with null stateCode
    await grant.update({ stateCode: null }, { individualHooks: true });
    const grantWithNullStateCode = await Grant.findOne({ where: { id: 11630 } });
    expect(grantWithNullStateCode.stateCode).toBeNull();
    await processFiles();
    const grantWithStateCode = await Grant.findOne({ where: { id: 11630 } });
    expect(grantWithStateCode.stateCode).toEqual('CT');
  });

  it('includes the annual funding month', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 11630 } });
    // simulate updating an existing grant with null stateCode
    await grant.update({ annualFundingMonth: null }, { individualHooks: true });
    const grantWithNullAfm = await Grant.findOne({ where: { id: 11630 } });
    expect(grantWithNullAfm.annualFundingMonth).toBeNull();
    await processFiles();
    const grantWithAfm = await Grant.findOne({ where: { id: 11630 } });
    expect(grantWithAfm.annualFundingMonth).toEqual('February');
  });

  it('handles nil states codes', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 10448 } });
    expect(grant.stateCode).toBeNull();
  });

  it('should import or update grants', async () => {
    const grantsBefore = await Grant.findAll({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });

    expect(grantsBefore.length).toBe(0);
    await processFiles();

    const grants = await Grant.findAll({ where: { recipientId: 1335 } });
    expect(grants).toBeDefined();
    expect(grants.length).toBe(7);
    const containsNumber = grants.some((g) => g.number === '02CH01111');
    expect(containsNumber).toBeTruthy();
    const totalGrants = await Grant.findAll({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
    expect(totalGrants.length).toBe(13);
  });

  it('includes the grant specialists name and email', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { number: '02CH01111' } });
    expect(grant.grantSpecialistName).toBe('grant');
    expect(grant.grantSpecialistEmail).toBe('grant@test.org');
  });

  it('includes the program specialists name and email', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { number: '02CH01111' } });
    expect(grant.programSpecialistName).toBe('program specialists');
    expect(grant.programSpecialistEmail).toBe(null);
  });

  it('should have null for grant/program specialists names if null from HSES', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { number: '90CI4444' } });
    expect(grant.programSpecialistName).toBe(null);
    expect(grant.programSpecialistEmail).toBe(null);
    expect(grant.grantSpecialistName).toBe(null);
    expect(grant.grantSpecialistEmail).toBe(null);
  });

  it('should not exclude recipients with only inactive grants', async () => {
    await processFiles();
    const recipient = await Recipient.findOne({ where: { id: 1119 } });
    expect(recipient).not.toBeNull();
  });

  it('should update an existing recipient if it exists in smarthub', async () => {
    const [dbRecipient] = await Recipient.findOrCreate({ where: { id: 1119, name: 'Multi ID Agency', uei: 'NNA5N2KHMGM2' } });
    await processFiles();
    const recipient = await Recipient.findOne({ where: { id: 1119 } });
    expect(recipient).not.toBeNull();
    // Same recipient, but with a different id and having an active grant
    expect(recipient.updatedAt).not.toEqual(dbRecipient.updatedAt);
    expect(recipient.name).toBe('Multi ID Agency');
  });

  it('should update an existing grant if it exists in smarthub', async () => {
    await Recipient.findOrCreate({ where: { id: 1119, name: 'Multi ID Agency', uei: 'NNA5N2KHMGM2' } });
    const [dbGrant] = await Grant.findOrCreate({ where: { id: 5151, number: '90CI4444', recipientId: 1119 } });
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 5151 } });
    expect(grant).not.toBeNull();
    expect(grant.updatedAt).not.toEqual(dbGrant.updatedAt);
    expect(grant.number).toBe('90CI4444');
  });

  it('should flag cdi grants', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 11630 } });
    expect(grant.cdi).toBeTruthy();
    expect(grant.regionId).toBe(13);
    expect(grant.recipientId).toBe(1119);
  });

  it('should update cdi grants', async () => {
    await Recipient.findOrCreate({ where: { id: 500, name: 'Another Agency', uei: 'NNA5N2KHMGA2' } });
    await Grant.create({
      status: 'Inactive', regionId: 5, id: 11630, number: '13CDI0001', recipientId: 500,
    });
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 11630 } });
    expect(grant.status).toBe('Active');
    expect(grant.regionId).toBe(5);
    expect(grant.recipientId).toBe(500);
  });

  it('should import programs', async () => {
    await processFiles();
    const program = await Program.findOne({ where: { id: 1 }, include: { model: Grant, as: 'grant' } });
    expect(program.status).toBe('Inactive');
    expect(program.grant.id).toBe(10567);
    expect(program.programType).toBe('HS');
  });

  it('sets metadata in audit tables', async () => {
    await processFiles('hex');
    const grantAuditEntry = await ZALGrant.findOne({ where: { data_id: 11630, dml_type: { [Op.not]: 'DELETE' } } });
    const {
      // eslint-disable-next-line camelcase
      descriptor_id, dml_by, dml_txid, session_sig,
    } = grantAuditEntry;

    expect(dml_by).toBe(0);
    expect(dml_txid).not.toMatch(/^00000000/);
    expect(session_sig).not.toBeNull();

    // eslint-disable-next-line camelcase
    const res = await sequelize.query(`SELECT descriptor FROM "ZADescriptor" WHERE id = ${descriptor_id}`, { type: QueryTypes.SELECT });
    expect(res[0].descriptor).toEqual('Grant data import from HSES');
  });
});
