import faker from '@faker-js/faker';
import db, {
  Recipient,
  Grant,
  GrantPersonnel,
} from '..';
import { GRANT_PERSONNEL_ROLES } from '../../constants';

describe('GrantPersonnel', () => {
  let grant;
  let recipient;
  let grantPersonnel;
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

    // Grant Personnel.
    grantPersonnel = await GrantPersonnel.create({
      // id: faker.datatype.number({ min: 10000, max: 100000 }),
      grantId: grant.id,
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
    await GrantPersonnel.destroy({
      where: {
        grantId: grant.id,
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

  it('grantPersonnel', async () => {
    // Get Grant Personnel.
    let grantPersonnelToCheck = await GrantPersonnel.findOne({
      where: {
        grantId: grant.id,
      },
    });

    // Assert all grant personnel values.
    expect(grantPersonnelToCheck).toHaveProperty('id');
    expect(grantPersonnelToCheck.grantId).toEqual(grant.id);
    expect(grantPersonnelToCheck.role).toEqual(GRANT_PERSONNEL_ROLES[0]);
    expect(grantPersonnelToCheck.active).toEqual(true);
    expect(grantPersonnelToCheck.prefix).toEqual('Mr.');
    expect(grantPersonnelToCheck.firstName).toEqual('John');
    expect(grantPersonnelToCheck.lastName).toEqual('Doe');
    expect(grantPersonnelToCheck.suffix).toEqual('Jr.');
    expect(grantPersonnelToCheck.title).toEqual('Director');
    expect(grantPersonnelToCheck.email).toEqual('john.doe@test.gov');
    expect(grantPersonnelToCheck.originalPersonnelId).toEqual(1);

    // Update Grant Personnel.
    grantPersonnelToCheck = await grantPersonnel.update({
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
    grantPersonnelToCheck = await GrantPersonnel.findOne({
      where: {
        grantId: grant.id,
      },
    });

    expect(grantPersonnelToCheck).toHaveProperty('id');
    expect(grantPersonnelToCheck.grantId).toEqual(grant.id);
    expect(grantPersonnelToCheck.role).toEqual(GRANT_PERSONNEL_ROLES[1]);
    expect(grantPersonnelToCheck.active).toEqual(false);
    expect(grantPersonnelToCheck.prefix).toEqual('Ms.');
    expect(grantPersonnelToCheck.firstName).toEqual('Jane');
    expect(grantPersonnelToCheck.lastName).toEqual('Doe');
    expect(grantPersonnelToCheck.suffix).toEqual('Sr2.');
    expect(grantPersonnelToCheck.title).toEqual('Director2');
    expect(grantPersonnelToCheck.email).toEqual('jane.doe@test.gov');
    expect(grantPersonnelToCheck.originalPersonnelId).toEqual(2);
  });

  it('grant returns grant personnel', async () => {
    // Get Grant.
    grant = await Grant.findOne({
      where: {
        id: grant.id,
      },
      include: [
        {
          model: GrantPersonnel,
          as: 'grantPersonnel',
        },
      ],
    });
    expect(grant.grantPersonnel[0].id).toBe(grantPersonnel.id);
  });
});
