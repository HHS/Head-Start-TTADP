import faker from '@faker-js/faker';
import db from '../models';
import recipientLeadership from './recipientLeadership';

describe('recipientLeadership', () => {
  const createProgramPersonnel = async (
    grantId,
    programId,
    role = 'Program Director',
    active = true,
  ) => db.ProgramPersonnel.create({
    grantId,
    programId,
    role,
    title: '',
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    suffix: faker.name.suffix(),
    prefix: faker.name.prefix(),
    active,
    effectiveDate: new Date(),
    mapsTo: null,
    email: faker.internet.email(),
  });

  const REGION_ID = 10;

  const recipient = {
    name: faker.datatype.string({ min: 10 }),
    id: faker.datatype.number({ min: 10000 }),
    uei: faker.datatype.string({ min: 10 }),
  };
  const grant = {
    id: faker.datatype.number({ min: 10000, max: 100000 }),
    number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
    regionId: REGION_ID,
    status: 'Active',
    startDate: new Date('2021/01/01'),
    endDate: new Date(),
    recipientId: recipient.id,
  };

  const grant2 = {
    id: faker.datatype.number({ min: 10000, max: 100000 }),
    number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
    regionId: REGION_ID + 1,
    status: 'Active',
    startDate: new Date('2021/01/01'),
    endDate: new Date(),
    recipientId: recipient.id,
  };

  const dummyProgram = {
    grantId: grant.id,
    startYear: '2023',
    startDate: '2023/01/01',
    endDate: '2023/12/31',
    status: 'Active',
    name: `${faker.animal.type() + faker.company.companyName()} Program`,
  };

  let activePersonnel;

  beforeAll(async () => {
    await db.Recipient.create(recipient);
    await db.Grant.create(grant);
    await db.Grant.create(grant2);

    const program1 = await db.Program.create({
      ...dummyProgram,
      id: faker.datatype.number({ min: 10000, max: 100000 }),
    });
    const program2 = await db.Program.create({
      ...dummyProgram,
      grantId: grant2.id,
      id: faker.datatype.number({ min: 10000, max: 100000 }),
    });

    // Program personnel to ignore
    // because it's on a different grant
    await createProgramPersonnel(grant2.id, program2.id);

    // Program personnel to ignore
    // because it's inactive
    await createProgramPersonnel(grant.id, program1.id, 'Program Director', false);

    // program personnel to retrieve
    activePersonnel = await Promise.all([
      createProgramPersonnel(grant.id, program1.id, 'Chief Financial Officer'),
      createProgramPersonnel(grant.id, program1.id, 'Program Director'),
      createProgramPersonnel(grant.id, program1.id, 'Director of Head Start'),
      createProgramPersonnel(grant.id, program1.id, 'Director of Early Head Start'),
    ]);
  });
  afterAll(async () => {
    await db.ProgramPersonnel.destroy({
      where: {
        grantId: [grant.id, grant2.id],
      },
    });

    await db.Program.destroy({
      where: {
        grantId: [grant.id, grant2.id],
      },
    });

    await db.Grant.destroy({
      where: {
        id: [grant.id, grant2.id],
      },
    });

    await db.Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await db.sequelize.close();
  });

  it('retrieves the correct program personnel', async () => {
    const leadership = await recipientLeadership(recipient.id, REGION_ID);
    expect(leadership.length).toBe(4);

    activePersonnel.sort((a, b) => a.role.localeCompare(b.role));

    const expectedNamesAndTitles = activePersonnel.map((p) => ({
      fullName: `${p.prefix} ${p.firstName} ${p.lastName} ${p.suffix}`,
      role: p.role,
    }));

    leadership.sort((a, b) => a.dataValues.role.localeCompare(b.role));

    leadership.forEach((p, i) => {
      expect(p.fullName).toBe(expectedNamesAndTitles[i].fullName);
      expect(p.role).toBe(expectedNamesAndTitles[i].role);
    });
  });
});
