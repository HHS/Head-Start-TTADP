import faker from '@faker-js/faker';
import db from '../models';
import recipientLeadershipHistory from './recipientLeadershipHistory';

describe('recipientLeadershipHistory', () => {
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
    effectiveDate: active ? new Date() : new Date('2020/01/01'),
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

  let inactive;
  let cfo;
  let director;
  let directorHeadStart;
  let directorEarlyHeadStart;

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

    // inactive program personnel
    inactive = await createProgramPersonnel(grant.id, program1.id, 'Program Director', false);

    // program personnel to retrieve
    cfo = await createProgramPersonnel(grant.id, program1.id, 'Chief Financial Officer');
    director = await createProgramPersonnel(grant.id, program1.id, 'Program Director');
    directorHeadStart = await createProgramPersonnel(grant.id, program1.id, 'Director of Head Start');
    directorEarlyHeadStart = await createProgramPersonnel(grant.id, program1.id, 'Director of Early Head Start');

    inactive.update({
      mapsTo: director.id,
    });
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
    const leadership = await recipientLeadershipHistory(recipient.id, REGION_ID);
    expect(leadership.length).toBe(4);

    leadership.sort((a, b) => a.role.localeCompare(b.role));
    const roles = leadership.map((p) => p.role);
    expect(roles).toEqual(['Chief Financial Officer', 'Director of Early Head Start', 'Director of Head Start', 'Program Director']);
    expect(leadership[0].history).toHaveLength(1);
    expect(leadership[0].history[0]).toEqual({
      id: cfo.id,
      grantId: grant.id,
      firstName: cfo.firstName,
      lastName: cfo.lastName,
      suffix: cfo.suffix,
      prefix: cfo.prefix,
      effectiveDate: expect.any(String),
    });
    expect(leadership[1].history).toHaveLength(1);
    expect(leadership[1].history[0]).toEqual({
      id: directorEarlyHeadStart.id,
      grantId: grant.id,
      firstName: directorEarlyHeadStart.firstName,
      lastName: directorEarlyHeadStart.lastName,
      suffix: directorEarlyHeadStart.suffix,
      prefix: directorEarlyHeadStart.prefix,
      effectiveDate: expect.any(String), // raw true cooerces to a string
    });
    expect(leadership[2].history).toHaveLength(1);
    expect(leadership[2].history[0]).toEqual({
      id: directorHeadStart.id,
      grantId: grant.id,
      firstName: directorHeadStart.firstName,
      lastName: directorHeadStart.lastName,
      suffix: directorHeadStart.suffix,
      prefix: directorHeadStart.prefix,
      effectiveDate: expect.any(String),
    });
    expect(leadership[3].history).toHaveLength(2);
    leadership[3].history.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    expect(leadership[3].history[0]).toEqual({
      id: inactive.id,
      grantId: grant.id,
      firstName: inactive.firstName,
      lastName: inactive.lastName,
      suffix: inactive.suffix,
      prefix: inactive.prefix,
      effectiveDate: expect.any(String),
    });
    expect(leadership[3].history[1]).toEqual({
      id: director.id,
      grantId: grant.id,
      firstName: director.firstName,
      lastName: director.lastName,
      suffix: director.suffix,
      prefix: director.prefix,
      effectiveDate: expect.any(String),
    });
  });
});
