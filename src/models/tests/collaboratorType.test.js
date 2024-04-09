const db = require('..');

describe('CollaboratorType', () => {
  let vf;
  let ct;
  let ct2;
  beforeAll((async () => {
    vf = await db.ValidFor.create({
      name: 'test',
    });

    ct = await db.CollaboratorType.create({
      name: 'test',
      validForId: vf.id,
    });

    ct2 = await db.CollaboratorType.create({
      name: 'test2',
      validForId: vf.id,
      mapsTo: ct.id,
    });
  }));

  it('should create a collaboratorType', async () => {
    await ct.reload({
      include: [
        {
          model: db.CollaboratorType,
          as: 'mapsToCollaboratorType',
          required: false,
        },
      ],
    });
    expect(ct).toBeDefined();
    expect(ct.name).toBe('test');
    expect(ct.latestName).toBe('test');
    expect(ct.latestId).toBe(ct.id);

    await ct2.reload({
      include: [
        {
          model: db.CollaboratorType,
          as: 'mapsToCollaboratorType',
          required: false,
        },
      ],
    });

    expect(ct2).toBeDefined();
    expect(ct2.name).toBe('test2');
    expect(ct2.latestName).toBe('test');
    expect(ct2.latestId).toBe(ct.id);
  });

  afterAll((async () => {
    await db.ValidFor.destroy({ where: { id: vf.id } });
    await db.CollaboratorType.destroy({ where: { id: ct.id } });
    await db.sequelize.close();
  }));
});
