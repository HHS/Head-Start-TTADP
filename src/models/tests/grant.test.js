import db, {
  Recipient,
  Grant,
  Program,
} from '..';

describe('Grants', () => {
  let grant;
  beforeAll(async () => {
    grant = await Grant.unscoped().findOne({
      include: [
        {
          model: Recipient.unscoped(),
          as: 'recipient',
        },
        {
          model: Program,
          as: 'programs',
        },
      ],
      order: [['id', 'ASC']],
      limit: 1,
    });
  });
  it('programTypes', () => {
    expect(grant.programTypes.sort())
      .toStrictEqual(grant.programs.map((p) => p.programType).sort());
  });
  it('name', () => {
    expect(grant.name)
      .toStrictEqual(grant.recipient
        ? `${grant.recipient.name} - ${grant.numberWithProgramTypes}`
        : `${grant.numberWithProgramTypes}`);
  });
  it('numberWithProgramTypes', () => {
    expect(grant.numberWithProgramTypes)
      .toStrictEqual(`${grant.dataValues.number} ${grant.programTypes?.join(', ')}`);
  });
  it('numberWithProgramTypes with program types', async () => {
    const grantWithPrograms = await Grant.unscoped().findOne({
      include: [
        {
          model: Program,
          as: 'programs',
          where: { programType: { [db.Sequelize.Op.ne]: null } },
        },
      ],
      order: [['id', 'ASC']],
      limit: 1,
    });
    expect(grantWithPrograms.numberWithProgramTypes)
      .toContain(` - ${grantWithPrograms.programTypes.join(', ')}`);
  });
  it('recipientInfo', () => {
    expect(grant.recipientInfo)
      .toStrictEqual(grant.recipient
        ? `${grant.recipient.name} - ${grant.dataValues.number} - ${grant.dataValues.recipientId}`
        : `${grant.dataValues.number} - ${grant.dataValues.recipientId}`);
  });
  describe('grant without recipient', () => {
    it('recipientInfo', async () => {
      const g = await Grant.unscoped().findOne({
        order: [['id', 'ASC']],
        limit: 1,
      });
      expect(g.recipientInfo).toBe(`${g.dataValues.number} - ${g.dataValues.recipientId}`);
    });

    it('recipientNameWithPrograms', async () => {
      const g = await Grant.unscoped().findOne({
        order: [['id', 'ASC']],
        limit: 1,
      });
      expect(g.recipientNameWithPrograms).toBe(`${g.dataValues.number} - ${g.dataValues.recipientId}`);
    });

    it('name', async () => {
      const g = await Grant.unscoped().findOne({
        order: [['id', 'ASC']],
        limit: 1,
      });
      expect(g.name).toContain(`${g.numberWithProgramTypes}`);
    });
  });
});
