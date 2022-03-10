import faker from 'faker';
import db, { Grant, Program } from '..';

const dummyProgram = {
  startYear: '2020',
  startDate: '2020-09-01',
  endDate: '2020-09-02',
  status: 'Active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('grant model', () => {
  describe('program type virtual field', () => {
    let programs;
    let grant;

    beforeAll(async () => {
      grant = await Grant.create({
        status: 'Active', regionId: 5, id: 11630, number: '13CDI0001', recipientId: 500,
      });
      programs = await Promise.all([
        {
          ...dummyProgram,
          id: faker.datatype.number(),
          name: faker.name.findName(),
          grantId: grant.id,
          programType: 'HS',
        },
        {
          ...dummyProgram,
          id: faker.datatype.number(),
          name: faker.name.findName(),
          grantId: grant.id,
          programType: 'HS',
        },
      ].map((p) => Program.create(p)));
    });

    afterAll(async () => {
      await Program.destroy({
        where: {
          id: programs.map((p) => p.id),
        },
      });
      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });

      await db.sequelize.close();
    });

    it('returns the proper program types', async () => {
      const [foundGrant] = await Grant.findAll({
        attributes: ['id', 'programTypes'],
        where: {
          id: grant.id,
        },
        include: [
          {
            model: Program,
            as: 'programs',
          },
        ],
      });

      expect(foundGrant.get('programTypes')).toStrictEqual(['HS']);
    });
  });
});
