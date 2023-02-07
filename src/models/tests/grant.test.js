import db, {
  Recipient,
  Grant,
  Program,
} from '..';

describe('Goals', () => {
  let grant;
  beforeAll(async () => {
    grant = await Grant.findOne({
      include: [
        {
          model: Recipient,
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
  it('recipientInfo', () => {
    expect(grant.recipientInfo)
      .toStrictEqual(grant.recipient
        ? `${grant.recipient.name} - ${grant.dataValues.number} - ${grant.dataValues.recipientId}`
        : `${grant.dataValues.number} - ${grant.dataValues.recipientId}`);
  });
});
