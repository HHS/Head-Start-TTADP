/* eslint-disable @typescript-eslint/naming-convention */
import { Op, QueryTypes } from 'sequelize';
import axios from 'axios';
import fs from 'mz/fs';
import updateGrantsRecipients, { processFiles, updateCDIGrantsWithOldGrantData } from './updateGrantsRecipients';
import db, {
  sequelize, Recipient, Goal, Grant, Program, ZALGrant, ActivityRecipient, ProgramPersonnel,
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
  afterAll(async () => {
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

describe('Update grants, program personnel, and recipients', () => {
  beforeAll(async () => {
    await Program.destroy({ where: { id: [1, 2, 3, 4] } });
    await ActivityRecipient.destroy({ where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Goal.destroy({ where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } }, force: true });
    await ProgramPersonnel.unscoped().destroy({
      where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } },
    });
    await Grant.unscoped().destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Recipient.unscoped().destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
  });
  afterEach(async () => {
    await Program.destroy({ where: { id: [1, 2, 3, 4] } });
    await ActivityRecipient.destroy({ where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Goal.destroy({ where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } }, force: true });
    await ProgramPersonnel.unscoped().destroy({
      where: { grantId: { [Op.gt]: SMALLEST_GRANT_ID } },
    });
    await Grant.unscoped().destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
    await Recipient.unscoped().destroy({ where: { id: { [Op.gt]: SMALLEST_GRANT_ID } } });
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

    const grants = await Grant.unscoped().findAll({ where: { recipientId: 1335 } });
    expect(grants).toBeDefined();
    expect(grants.length).toBe(7);
    const containsNumber = grants.some((g) => g.number === '02CH01111');
    expect(containsNumber).toBeTruthy();

    const containsGranteeName = grants.some((g) => g.granteeName === 'Agency 1, Inc.');
    expect(containsGranteeName).toBeTruthy();

    const totalGrants = await Grant.unscoped().findAll({
      where: { id: { [Op.gt]: SMALLEST_GRANT_ID } },
    });
    expect(totalGrants.length).toBe(15);
  });

  it('should import or update program personnel', async () => {
    // Create auth_official_contact personnel to update.
    const personnelToUpdate = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F321_orig',
      lastName: 'L321_orig',
      title: 'Governing Board Chairperson_orig',
      email: '456@example.org',
      suffix: 'Jr.',
      prefix: 'Dr.',
      active: true,
    });

    // Create director personnel to update.
    const directorToUpdate = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'director',
      firstName: 'F3333_orig',
      lastName: 'L3333_orig',
      email: '3333_orig@example.org',
      suffix: 'Jr.',
      prefix: 'Dr.',
      active: true,
    });

    // Check we have no program personnel.
    const programPersonnelBefore = await ProgramPersonnel.findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelBefore.length).toBe(2);

    // Process the files.
    await processFiles();

    const programPersonnelAdded = await ProgramPersonnel.unscoped().findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelAdded).toBeDefined();
    expect(programPersonnelAdded.length).toBe(18);

    // Get first program.
    let personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 1);
    expect(personnelToAssert.length).toBe(4);

    // Auth Official Contact.
    expect(personnelToAssert[0].role).toBe('auth_official_contact');
    expect(personnelToAssert[0].title).toBe('Board President');
    expect(personnelToAssert[0].firstName).toBe('F47125');
    expect(personnelToAssert[0].lastName).toBe('L47125');
    expect(personnelToAssert[0].prefix).toBe('Mr.');
    expect(personnelToAssert[0].email).toBe('47125@hsesinfo.org');
    expect(personnelToAssert[0].active).toBe(true);

    // CEO.
    expect(personnelToAssert[1].role).toBe('ceo');
    expect(personnelToAssert[1].title).toBe('CEO');
    expect(personnelToAssert[1].firstName).toBe('F47126');
    expect(personnelToAssert[1].lastName).toBe('L47126');
    expect(personnelToAssert[1].prefix).toBe('Ms.');
    expect(personnelToAssert[1].email).toBe('47126@hsesinfo.org');
    expect(personnelToAssert[1].active).toBe(true);

    // Policy Council.
    expect(personnelToAssert[2].role).toBe('policy_council');
    expect(personnelToAssert[2].title).toBe(null);
    expect(personnelToAssert[2].firstName).toBe('F47128');
    expect(personnelToAssert[2].lastName).toBe('L47128');
    expect(personnelToAssert[2].prefix).toBe('Ms.');
    expect(personnelToAssert[2].email).toBe('47128@hsesinfo.org');
    expect(personnelToAssert[2].active).toBe(true);

    // Director.
    expect(personnelToAssert[3].role).toBe('director');
    expect(personnelToAssert[3].title).toBe(null);
    expect(personnelToAssert[3].firstName).toBe('F47124');
    expect(personnelToAssert[3].lastName).toBe('L47124');
    expect(personnelToAssert[3].prefix).toBe('Ms.');
    expect(personnelToAssert[3].email).toBe('47124@hsesinfo.org');
    expect(personnelToAssert[3].active).toBe(true);

    // Get second program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 2);
    expect(personnelToAssert.length).toBe(4);

    // Get third program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 3);
    expect(personnelToAssert.length).toBe(4);

    // Get fourth program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 4);
    expect(personnelToAssert.length).toBe(6);

    // Filter auth_official_contact.
    const authOfficial = personnelToAssert.filter((gp) => gp.role === 'auth_official_contact');
    expect(authOfficial.length).toBe(2);

    // Assert that the old personnel was updated.
    let oldPersonnel = authOfficial.find((gp) => gp.id === personnelToUpdate.id);
    expect(oldPersonnel).toBeDefined();
    expect(oldPersonnel.firstName).toBe('F321_orig');
    expect(oldPersonnel.lastName).toBe('L321_orig');
    expect(oldPersonnel.title).toBe('Governing Board Chairperson_orig');
    expect(oldPersonnel.active).toBe(false);

    // Assert the new personnel was added and references the old personnel.
    let newPersonnel = authOfficial.find((gp) => gp.id !== personnelToUpdate.id);
    expect(newPersonnel).toBeDefined();
    expect(newPersonnel.firstName).toBe('F123');
    expect(newPersonnel.lastName).toBe('L123');
    expect(newPersonnel.title).toBe('Governing Board Chairperson');
    expect(newPersonnel.email).toBe('123@example.org');
    expect(newPersonnel.active).toBe(true);
    expect(newPersonnel.mapsTo).toBe(null);
    expect(newPersonnel.effectiveDate).not.toBeNull();

    // Filter director.
    const directorPersonnel = personnelToAssert.filter((gp) => gp.role === 'director');
    expect(directorPersonnel.length).toBe(2);

    // Assert that the old personnel was updated.
    oldPersonnel = directorPersonnel.find((gp) => gp.id === directorToUpdate.id);
    expect(oldPersonnel).toBeDefined();
    expect(oldPersonnel.firstName).toBe('F3333_orig');
    expect(oldPersonnel.lastName).toBe('L3333_orig');
    expect(oldPersonnel.email).toBe('3333_orig@example.org');
    expect(oldPersonnel.title).toBe(null);
    expect(oldPersonnel.active).toBe(false);

    // Assert the new personnel was added and references the old personnel.
    newPersonnel = directorPersonnel.find((gp) => gp.id !== directorToUpdate.id);
    expect(newPersonnel).toBeDefined();
    expect(newPersonnel.firstName).toBe('F3333');
    expect(newPersonnel.lastName).toBe('L3333');
    expect(oldPersonnel.title).toBe(null);
    expect(newPersonnel.email).toBe('3333@example.org');
    expect(newPersonnel.active).toBe(true);
    expect(newPersonnel.mapsTo).toBe(null);
    expect(newPersonnel.effectiveDate).not.toBeNull();
  });

  it('dont do anything if personnel already exists with this role and email', async () => {
    // Create auth_official_contact personnel to update.
    const personnelNotToUpdate = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F123',
      lastName: 'L123',
      title: 'Governing Board Chairperson',
      email: '123@example.org',
      suffix: 'Jr.',
      prefix: 'Dr.',
      effectiveDate: new Date('2023-01-01'),
      active: true,
    });

    // Check we have no program personnel.
    const programPersonnelBefore = await ProgramPersonnel.findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelBefore.length).toBe(1);

    // Process the files.
    await processFiles();

    const programPersonnelAdded = await ProgramPersonnel.unscoped().findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelAdded).toBeDefined();
    expect(programPersonnelAdded.length).toBe(16);

    // Get first program.
    let personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 1);
    expect(personnelToAssert.length).toBe(4);

    // Auth Official Contact.
    expect(personnelToAssert[0].role).toBe('auth_official_contact');
    expect(personnelToAssert[0].title).toBe('Board President');
    expect(personnelToAssert[0].firstName).toBe('F47125');
    expect(personnelToAssert[0].lastName).toBe('L47125');
    expect(personnelToAssert[0].prefix).toBe('Mr.');
    expect(personnelToAssert[0].email).toBe('47125@hsesinfo.org');
    expect(personnelToAssert[0].active).toBe(true);

    // CEO.
    expect(personnelToAssert[1].role).toBe('ceo');
    expect(personnelToAssert[1].title).toBe('CEO');
    expect(personnelToAssert[1].firstName).toBe('F47126');
    expect(personnelToAssert[1].lastName).toBe('L47126');
    expect(personnelToAssert[1].prefix).toBe('Ms.');
    expect(personnelToAssert[1].email).toBe('47126@hsesinfo.org');
    expect(personnelToAssert[1].active).toBe(true);

    // Policy Council.
    expect(personnelToAssert[2].role).toBe('policy_council');
    expect(personnelToAssert[2].title).toBe(null);
    expect(personnelToAssert[2].firstName).toBe('F47128');
    expect(personnelToAssert[2].lastName).toBe('L47128');
    expect(personnelToAssert[2].prefix).toBe('Ms.');
    expect(personnelToAssert[2].email).toBe('47128@hsesinfo.org');
    expect(personnelToAssert[2].active).toBe(true);

    // Director.
    expect(personnelToAssert[3].role).toBe('director');
    expect(personnelToAssert[3].title).toBe(null);
    expect(personnelToAssert[3].firstName).toBe('F47124');
    expect(personnelToAssert[3].lastName).toBe('L47124');
    expect(personnelToAssert[3].prefix).toBe('Ms.');
    expect(personnelToAssert[3].email).toBe('47124@hsesinfo.org');
    expect(personnelToAssert[3].active).toBe(true);

    // Get second program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 2);
    expect(personnelToAssert.length).toBe(4);

    // Get third program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 3);
    expect(personnelToAssert.length).toBe(4);

    // Get fourth program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 4);
    expect(personnelToAssert.length).toBe(4);

    // Filter auth_official_contact.
    const authOfficial = personnelToAssert.filter((gp) => gp.role === 'auth_official_contact');
    expect(authOfficial.length).toBe(1);

    // Assert that the old active personnel was updated but is still active.
    const newPersonnel = authOfficial.find((gp) => gp.id === personnelNotToUpdate.id);
    expect(newPersonnel).toBeDefined();
    expect(newPersonnel.firstName).toBe('F123');
    expect(newPersonnel.lastName).toBe('L123');
    expect(newPersonnel.title).toBe('Governing Board Chairperson');
    expect(newPersonnel.email).toBe('123@example.org');
    expect(newPersonnel.active).toBe(true);
    expect(newPersonnel.mapsTo).toBe(null);
    expect(newPersonnel.effectiveDate).not.toBeNull();
  });

  it('add if user exists with same name but is deactivated', async () => {
    // This name already exists for this role 'John Smith' but personnel in inactive.
    // This could mean a new personnel with the same name.
    const deactivatedPersonnel = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F123',
      lastName: 'L123',
      title: 'Governing Board Chairperson',
      email: '456@example.org',
      suffix: 'Jr.',
      prefix: 'Dr.',
      effectiveDate: new Date('2023-01-01'),
      active: false,
    });

    // This is the active personnel for this role.
    const personnelToUpdate = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F321',
      lastName: 'L321',
      title: 'Governing Board Chairperson',
      email: '321@example.org',
      suffix: 'Jr.',
      prefix: 'Dr.',
      effectiveDate: new Date('2023-01-02'),
      active: true,
    });

    // Check we have no program personnel.
    const programPersonnelBefore = await ProgramPersonnel.findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelBefore.length).toBe(2);

    // Process the files.
    await processFiles();

    const programPersonnelAdded = await ProgramPersonnel.unscoped().findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelAdded).toBeDefined();
    expect(programPersonnelAdded.length).toBe(18);

    // Get first program.
    let personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 1);
    expect(personnelToAssert.length).toBe(4);

    // Auth Official Contact.
    expect(personnelToAssert[0].role).toBe('auth_official_contact');
    expect(personnelToAssert[0].title).toBe('Board President');
    expect(personnelToAssert[0].firstName).toBe('F47125');
    expect(personnelToAssert[0].lastName).toBe('L47125');
    expect(personnelToAssert[0].prefix).toBe('Mr.');
    expect(personnelToAssert[0].email).toBe('47125@hsesinfo.org');
    expect(personnelToAssert[0].active).toBe(true);

    // CEO.
    expect(personnelToAssert[1].role).toBe('ceo');
    expect(personnelToAssert[1].title).toBe('CEO');
    expect(personnelToAssert[1].firstName).toBe('F47126');
    expect(personnelToAssert[1].lastName).toBe('L47126');
    expect(personnelToAssert[1].prefix).toBe('Ms.');
    expect(personnelToAssert[1].email).toBe('47126@hsesinfo.org');
    expect(personnelToAssert[1].active).toBe(true);

    // Policy Council.
    expect(personnelToAssert[2].role).toBe('policy_council');
    expect(personnelToAssert[2].title).toBe(null);
    expect(personnelToAssert[2].firstName).toBe('F47128');
    expect(personnelToAssert[2].lastName).toBe('L47128');
    expect(personnelToAssert[2].prefix).toBe('Ms.');
    expect(personnelToAssert[2].email).toBe('47128@hsesinfo.org');
    expect(personnelToAssert[2].active).toBe(true);

    // Director.
    expect(personnelToAssert[3].role).toBe('director');
    expect(personnelToAssert[3].title).toBe(null);
    expect(personnelToAssert[3].firstName).toBe('F47124');
    expect(personnelToAssert[3].lastName).toBe('L47124');
    expect(personnelToAssert[3].prefix).toBe('Ms.');
    expect(personnelToAssert[3].email).toBe('47124@hsesinfo.org');
    expect(personnelToAssert[3].active).toBe(true);

    // Get second program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 2);
    expect(personnelToAssert.length).toBe(4);

    // Get third program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 3);
    expect(personnelToAssert.length).toBe(4);

    // Get fourth program.
    personnelToAssert = programPersonnelAdded.filter((gp) => gp.programId === 4);
    expect(personnelToAssert.length).toBe(6);

    // Filter auth_official_contact deactivated.
    const authOfficialDeactivated = personnelToAssert.filter((gp) => gp.programId === 4 && gp.role === 'auth_official_contact' && gp.active === false);
    expect(authOfficialDeactivated.length).toBe(2);
    // Check deactivated ids are what we expect.
    const ids = authOfficialDeactivated.map((gp) => gp.id);
    expect(ids).toContain(deactivatedPersonnel.id);
    expect(ids).toContain(personnelToUpdate.id);

    // Filter auth_official_contact.
    const authOfficial = personnelToAssert.filter((gp) => gp.role === 'auth_official_contact' && gp.active === true);
    expect(authOfficial.length).toBe(1);

    // Assert that the old personnel was left alone.
    const newPersonnel = authOfficial[0];
    expect(newPersonnel).toBeDefined();
    expect(newPersonnel.firstName).toBe('F123');
    expect(newPersonnel.lastName).toBe('L123');
    expect(newPersonnel.title).toBe('Governing Board Chairperson');
    expect(newPersonnel.email).toBe('123@example.org');
    expect(newPersonnel.active).toBe(true);
    expect(newPersonnel.mapsTo).toBe(null);
    expect(newPersonnel.effectiveDate).not.toBeNull();

    // Expect both deactivated personnel to have a mapsTo value of the newPersonnel.
    expect(authOfficialDeactivated[0].mapsTo).toBe(newPersonnel.id);
    expect(authOfficialDeactivated[1].mapsTo).toBe(newPersonnel.id);
  });

  it('add if user exists but is deactivated', async () => {
    // This person exists but is deactivated.
    const deactivatedPersonnel = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F123',
      lastName: 'L123',
      title: 'Governing Board Chairperson',
      email: '123@example.org',
      suffix: 'Mr.',
      prefix: 'Ms.',
      effectiveDate: new Date('2023-01-01'),
      active: false,
    });

    // Check we have one deactivated program personnel.
    const programPersonnelBefore = await ProgramPersonnel.findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelBefore.length).toBe(1);
    expect(programPersonnelBefore[0].active).toBe(false);

    // Process the files.
    await processFiles();

    // Get all records for our test case.
    const programPersonnelToAssert = await ProgramPersonnel.unscoped().findAll(
      {
        where: {
          grantId: 14495,
          programId: 4,
          role: 'auth_official_contact',
        },
      },
    );

    // Assert number of records for this grant, program, and role.
    expect(programPersonnelToAssert.length).toBe(2);

    // Assert records for fist name.
    const firstNames = programPersonnelToAssert.filter(
      (gp) => gp.firstName === deactivatedPersonnel.firstName,
    );

    // Assert records for last name.
    expect(firstNames.length).toBe(2);
    const lastNames = programPersonnelToAssert.filter(
      (gp) => gp.lastName === deactivatedPersonnel.lastName,
    );
    expect(lastNames.length).toBe(2);

    // Assert one value has active false.
    const deactivated = programPersonnelToAssert.find((gp) => gp.active === false);
    expect(deactivated).toBeDefined();

    // Assert one value has active true.
    const active = programPersonnelToAssert.find((gp) => gp.active === true);
    expect(active).toBeDefined();
  });

  it('update existing active user with new data', async () => {
    // This person exists but is deactivated.
    const activePersonnel = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F123',
      lastName: 'L123',
      title: 'Governing Board Chairperson_orig',
      email: '123@example.org', // Same email as import.
      suffix: 'Orig.',
      prefix: 'Orig.',
      effectiveDate: new Date('2023-01-01'),
      active: true,
      mapsTo: null,
    });

    // Check we have one deactivated program personnel.
    const programPersonnelBefore = await ProgramPersonnel.findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelBefore.length).toBe(1);
    expect(programPersonnelBefore[0].active).toBe(true);

    // Process the files.
    await processFiles();

    // Get all records for our test case.
    const programPersonnelToAssert = await ProgramPersonnel.unscoped().findAll(
      {
        where: {
          grantId: 14495,
          programId: 4,
          role: 'auth_official_contact',
        },
      },
    );

    // Assert number of records for this grant, program, and role.
    expect(programPersonnelToAssert.length).toBe(1);

    // Assert records for fist name.
    expect(programPersonnelToAssert[0].firstName).toBe(activePersonnel.firstName);

    // Assert records for last name.
    expect(programPersonnelToAssert[0].lastName).toBe(activePersonnel.lastName);

    // Assert has active true.
    expect(programPersonnelToAssert[0].active).toBe(true);

    // Assert has new title.
    expect(programPersonnelToAssert[0].title).toBe('Governing Board Chairperson');

    // Assert has new email.
    expect(programPersonnelToAssert[0].email).toBe('123@example.org');

    // Assert has new suffix.
    expect(programPersonnelToAssert[0].suffix).toBe(null);

    // Assert has new prefix.
    expect(programPersonnelToAssert[0].prefix).toBe('Mr.');

    // Assert has new mapsTo.
    expect(programPersonnelToAssert[0].mapsTo).toBe(null);

    // Assert has same effective date.
    expect(programPersonnelToAssert[0].effectiveDate).toEqual(activePersonnel.effectiveDate);

    // Assert has new updatedAt date.
    expect(programPersonnelToAssert[0].updatedAt).not.toEqual(programPersonnelBefore[0].updatedAt);
  });

  it('add new record if existing active user has same name but different email', async () => {
    // This person exists but is deactivated.
    const activePersonnel = await ProgramPersonnel.create({
      grantId: 14495,
      programId: 4,
      role: 'auth_official_contact',
      firstName: 'F123',
      lastName: 'L123',
      title: 'Governing Board Chairperson_orig',
      email: '456@example.org', // Different email as import.
      suffix: 'Orig.',
      prefix: 'Orig.',
      effectiveDate: new Date('2023-01-01'),
      active: true,
    });

    // Check we have one deactivated program personnel.
    const programPersonnelBefore = await ProgramPersonnel.findAll(
      {
        where: {
          grantId: { [Op.gt]: SMALLEST_GRANT_ID },
        },
      },
    );
    expect(programPersonnelBefore.length).toBe(1);
    expect(programPersonnelBefore[0].active).toBe(true);

    // Process the files.
    await processFiles();
    // Get all records for our test case.
    const programPersonnelToAssert = await ProgramPersonnel.unscoped().findAll(
      {
        where: {
          grantId: 14495,
          programId: 4,
          role: 'auth_official_contact',
        },
      },
    );

    // Assert number of records for this grant, program, and role.
    expect(programPersonnelToAssert.length).toBe(2);

    // Assert the record that is no longer active has an email address of '456@example.org'.
    const inactivePersonnel = programPersonnelToAssert.find((gp) => gp.active === false);
    expect(inactivePersonnel).toBeDefined();
    expect(inactivePersonnel.email).toBe('456@example.org');
    expect(inactivePersonnel.firstName).toBe(activePersonnel.firstName);
    expect(inactivePersonnel.lastName).toBe(activePersonnel.lastName);
    expect(inactivePersonnel.role).toBe(activePersonnel.role);
    expect(inactivePersonnel.title).toBe(activePersonnel.title);

    // Assert the record that is active has an email address of '123@example.org'.
    const activePersonnelAssert = programPersonnelToAssert.find((gp) => gp.active === true);
    expect(activePersonnelAssert).toBeDefined();
    expect(activePersonnelAssert.email).toBe('123@example.org');
    expect(activePersonnelAssert.firstName).toBe(activePersonnel.firstName);
    expect(activePersonnelAssert.lastName).toBe(activePersonnel.lastName);
    expect(activePersonnelAssert.role).toBe(activePersonnel.role);
    expect(activePersonnel.title).toBe(activePersonnel.title);
    expect(activePersonnel.mapsTo).toBe(null);

    // Assert' mapsTo' points to new record.
    expect(inactivePersonnel.mapsTo).toBe(activePersonnelAssert.id);
  });

  it('includes the grant specialists name, email, and grantee name', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { number: '02CH01111' } });
    expect(grant.grantSpecialistName).toBe('grant');
    expect(grant.grantSpecialistEmail).toBe('grant@test.org');
    expect(grant.granteeName).toBe('Agency 1, Inc.');
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
    expect(grant.granteeName).toBe(null);
  });

  it('should not exclude recipients with only inactive grants', async () => {
    await processFiles();
    const recipient = await Recipient.findOne({ where: { id: 1119 } });
    expect(recipient).not.toBeNull();
  });

  it('should rename recipient (628)', async () => {
    const recipientBefore = await Recipient.findOne({ where: { id: 628 } });
    expect(recipientBefore).not.toBeNull();
    await recipientBefore.update({ name: 'DBA' });
    expect(recipientBefore.name).toBe('DBA');
    await processFiles();
    const recipient = await Recipient.findOne({ where: { id: 628 } });
    expect(recipient).not.toBeNull();
    expect(recipient.name).toBe('Entity name');
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
    await Recipient.findOrCreate({ where: { id: 1119, name: 'Multi ID Agency', uei: 'NNA5N2KDFGN2' } });
    await Grant.create({
      status: 'Inactive',
      regionId: 5,
      id: 11630,
      number: '13CDI0001',
      recipientId: 1119,
      startDate: '2019-01-01',
      endDate: '2021-01-01',
    });
    await processFiles();
    const grant = await Grant.unscoped().findOne({ where: { id: 11630 } });
    expect(grant.status).toBe('Active');
    expect(grant.regionId).toBe(5);
    expect(grant.recipientId).toBe(1119);
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
    const grantAuditEntry = await ZALGrant.findOne({
      where: { data_id: 11630, dml_type: { [Op.not]: 'DELETE' } },
      order: [
        ['id', 'DESC'],
      ],
    });
    const {
      descriptor_id, dml_by, dml_as, dml_txid, session_sig,
    } = grantAuditEntry;

    expect(dml_by).toBe('0'); // bigint comes back as a string
    expect(dml_as).toBe('3'); // bigint comes back as a string
    expect(dml_txid).not.toMatch(/^00000000/);
    expect(session_sig).not.toBeNull();

    // eslint-disable-next-line camelcase
    const res = await sequelize.query(`SELECT descriptor FROM "ZADescriptor" WHERE id = ${descriptor_id}`, { type: QueryTypes.SELECT });
    expect(res[0].descriptor).toEqual('Grant data import from HSES');
  });

  it('includes the inactivated date', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 8317 } });
    // simulate updating an existing grant with null inactivationDate
    await grant.update({ inactivationDate: null }, { individualHooks: true });
    const grantWithNullinactivationDate = await Grant.findOne({ where: { id: 8317 } });
    expect(grantWithNullinactivationDate.inactivationDate).toBeNull();
    await processFiles();
    const grantWithinactivationDate = await Grant.findOne({ where: { id: 8317 } });
    expect(grantWithinactivationDate.inactivationDate).toEqual(new Date('2022-07-31'));
  });

  it('includes the inactivated reason', async () => {
    await processFiles();
    const grant = await Grant.findOne({ where: { id: 8317 } });
    // simulate updating an existing grant with null inactivationReason
    await grant.update({ inactivationReason: null }, { individualHooks: true });
    const grantWithNullinactivationReason = await Grant.findOne({ where: { id: 8317 } });
    expect(grantWithNullinactivationReason.inactivationReason).toBeNull();
    await processFiles();
    const grantWithinactivationReason = await Grant.findOne({ where: { id: 8317 } });
    expect(grantWithinactivationReason.inactivationReason).toEqual('Replaced');
  });

  describe('updateCDIGrantsWithOldGrantData', () => {
    afterAll(async () => {
      await Grant.destroy({ where: { id: { [Op.in]: [3001, 3002, 3003, 3004] } } });
      await db.sequelize.close();
    });

    it('should update CDI grants based on oldGrantId', async () => {
      // Create old grants
      const oldGrant1 = await Grant.create({
        id: 3001, recipientId: 10, regionId: 1, number: 'X1',
      });
      const oldGrant2 = await Grant.create({
        id: 3002, recipientId: 11, regionId: 2, number: 'X2',
      });

      // Create CDI grants linked to old grants
      const grant1 = await Grant.create({
        id: 3003, cdi: true, oldGrantId: oldGrant1.id, number: 'X3', recipientId: 628,
      });
      const grant2 = await Grant.create({
        id: 3004, cdi: true, oldGrantId: oldGrant2.id, number: 'X4', recipientId: 628,
      });

      await updateCDIGrantsWithOldGrantData([grant1, grant2]);

      // Fetch the updated grants from the database
      const updatedGrant1 = await Grant.findByPk(grant1.id);
      const updatedGrant2 = await Grant.findByPk(grant2.id);

      expect(updatedGrant1.recipientId).toEqual(10);
      expect(updatedGrant1.regionId).toEqual(1);
      expect(updatedGrant2.recipientId).toEqual(11);
      expect(updatedGrant2.regionId).toEqual(2);
    });
  });
});
