import { Op } from 'sequelize';
import axios from 'axios';
import fs from 'mz/fs';
import updateGrantsGrantees, { processFiles } from './updateGrantsGrantees';
import db, {
  Grantee, Grant,
} from '../models';

jest.mock('axios');
const mockZip = jest.fn();
jest.mock('adm-zip', () => jest.fn().mockImplementation(() => ({ extractAllTo: mockZip })));

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
    await updateGrantsGrantees(processFunc);

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
    await expect(updateGrantsGrantees(processFunc)).rejects.not.toThrow();

    expect(mockZip).not.toHaveBeenCalled();
    expect(processFunc).not.toHaveBeenCalled();
  });
});

describe('Update grants and grantees', () => {
  beforeAll(async () => {
    await Grant.destroy({ where: { id: { [Op.gt]: 20 } } });
    await Grantee.destroy({ where: { id: { [Op.gt]: 20 } } });
  });
  afterEach(async () => {
    await Grant.destroy({ where: { id: { [Op.gt]: 20 } } });
    await Grantee.destroy({ where: { id: { [Op.gt]: 20 } } });
  });
  afterAll(() => {
    db.sequelize.close();
  });
  it('should import or update grantees', async () => {
    const granteesBefore = await Grantee.findAll({ where: { id: { [Op.gt]: 20 } } });
    expect(granteesBefore.length).toBe(0);
    await processFiles();

    const grantee = await Grantee.findOne({ where: { id: 1335 } });
    expect(grantee).toBeDefined();
    expect(grantee.name).toBe('Agency 1, Inc.');
  });

  it('should import or update grants', async () => {
    const grantsBefore = await Grant.findAll({ where: { id: { [Op.gt]: 20 } } });

    expect(grantsBefore.length).toBe(0);
    await processFiles();

    const grants = await Grant.findAll({ where: { granteeId: 1335 } });
    expect(grants).toBeDefined();
    expect(grants.length).toBe(7);
    const containsNumber = grants.some((g) => g.number === '02CH01111');
    expect(containsNumber).toBeTruthy();
    const totalGrants = await Grant.findAll({ where: { id: { [Op.gt]: 20 } } });
    expect(totalGrants.length).toBe(10);
  });

  it('should not exclude grantees with only inactive grants', async () => {
    await processFiles();
    const grantee = await Grantee.findOne({ where: { id: 119 } });
    expect(grantee).not.toBeNull();
  });

  it('should update an existing grantee if it exists in smarthub', async () => {
    const [dbGrantee] = await Grantee.findOrCreate({ where: { id: 119, name: 'Multi ID Agency' } });
    await processFiles();
    const grantee = await Grantee.findOne({ where: { id: 119 } });
    expect(grantee).not.toBeNull();
    // Same grantee, but with a different id and having an active grant
    expect(grantee.updatedAt).not.toEqual(dbGrantee.updatedAt);
    expect(grantee.name).toBe('Multi ID Agency');
  });

  it('should update an existing grant if it exists in smarthub', async () => {
    await Grantee.findOrCreate({ where: { id: 119, name: 'Multi ID Agency' } });
    const [dbGrant] = await Grant.findOrCreate({ where: { id: 5151, number: '90CI4444', granteeId: 119 } });
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 5151 } });
    expect(grant).not.toBeNull();
    expect(grant.updatedAt).not.toEqual(dbGrant.updatedAt);
    expect(grant.number).toBe('90CI4444');
  });
});
