import faker from '@faker-js/faker';
import db, {
  Recipient,
  Grant,
  Program,
  ProgramPersonnel,
} from '..';
import { GRANT_PERSONNEL_ROLES } from '../../constants';

describe('ProgramPersonnel', () => {
  let grant;
  let recipient;
  let program;
  let programPersonnel;
  beforeAll(async () => {
    // Recipient.
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.company.companyName(),
      uei: 'BNA5N2FDWGN2',
    });

    // Grant.
    grant = await Grant.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      status: 'Active',
      regionId: 1,
      number: '43CDFW001',
      recipientId: recipient.id,
      startDate: '2023-01-01',
      endDate: '2025-12-31',
    });

    // Program.
    program = await Program.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      grantId: grant.id,
      name: 'Sample Program Personnel',
      programType: 'HS',
      startYear: '2023',
      status: 'active',
      startDate: '2023',
      endDate: '2025',
    });

    // Grant Personnel.
    programPersonnel = await ProgramPersonnel.create({
      grantId: grant.id,
      programId: program.id,
      role: GRANT_PERSONNEL_ROLES[0],
      active: true,
      prefix: 'Mr.',
      firstName: 'John',
      lastName: 'Doe',
      suffix: 'Jr.',
      title: 'Director',
      email: 'john.doe@test.gov',
      effectiveDate: '2023-01-01',
      originalPersonnelId: 1,
    });
  });
  afterAll(async () => {
    // Delete Grant Personnel.
    await ProgramPersonnel.destroy({
      where: {
        grantId: grant.id,
      },
    });

    // Delete Program.
    await Program.destroy({
      where: {
        id: program.id,
      },
    });

    // Delete Grant.
    await Grant.destroy({
      where: {
        id: grant.id,
      },
    });

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await db.sequelize.close();
  });

  it('programPersonnel', async () => {
    // Get Grant Personnel.
    let programPersonnelToCheck = await ProgramPersonnel.findOne({
      where: {
        grantId: grant.id,
      },
    });

    // Assert all grant personnel values.
    expect(programPersonnelToCheck).toHaveProperty('id');
    expect(programPersonnelToCheck.grantId).toEqual(grant.id);
    expect(programPersonnelToCheck.programId).toEqual(program.id);
    expect(programPersonnelToCheck.role).toEqual(GRANT_PERSONNEL_ROLES[0]);
    expect(programPersonnelToCheck.active).toEqual(true);
    expect(programPersonnelToCheck.prefix).toEqual('Mr.');
    expect(programPersonnelToCheck.firstName).toEqual('John');
    expect(programPersonnelToCheck.lastName).toEqual('Doe');
    expect(programPersonnelToCheck.suffix).toEqual('Jr.');
    expect(programPersonnelToCheck.title).toEqual('Director');
    expect(programPersonnelToCheck.email).toEqual('john.doe@test.gov');
    expect(programPersonnelToCheck.originalPersonnelId).toEqual(1);

    // Update Grant Personnel.
    programPersonnelToCheck = await programPersonnel.update({
      role: GRANT_PERSONNEL_ROLES[1],
      active: false,
      prefix: 'Ms.',
      firstName: 'Jane',
      lastName: 'Doe',
      suffix: 'Sr2.',
      title: 'Director2',
      email: 'jane.doe@test.gov',
      effectiveDate: '2023-01-02',
      originalPersonnelId: 2,
    });

    // Assert all grant personnel values.
    programPersonnelToCheck = await ProgramPersonnel.findOne({
      where: {
        grantId: grant.id,
      },
    });

    expect(programPersonnelToCheck).toHaveProperty('id');
    expect(programPersonnelToCheck.grantId).toEqual(grant.id);
    expect(programPersonnelToCheck.role).toEqual(GRANT_PERSONNEL_ROLES[1]);
    expect(programPersonnelToCheck.active).toEqual(false);
    expect(programPersonnelToCheck.prefix).toEqual('Ms.');
    expect(programPersonnelToCheck.firstName).toEqual('Jane');
    expect(programPersonnelToCheck.lastName).toEqual('Doe');
    expect(programPersonnelToCheck.suffix).toEqual('Sr2.');
    expect(programPersonnelToCheck.title).toEqual('Director2');
    expect(programPersonnelToCheck.email).toEqual('jane.doe@test.gov');
    expect(programPersonnelToCheck.originalPersonnelId).toEqual(2);
  });

  it('grant returns grant personnel', async () => {
    // Get Grant.
    grant = await Grant.findOne({
      where: {
        id: grant.id,
      },
      include: [
        {
          model: ProgramPersonnel,
          as: 'programPersonnel',
        },
      ],
    });
    expect(grant.programPersonnel[0].id).toBe(programPersonnel.id);
  });
});
