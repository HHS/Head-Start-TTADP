const db = require('..');

describe('ValidFor', () => {
  let vf;
  let vf2;
  beforeAll((async () => {
    vf = await db.ValidFor.create({
      isReport: true,
      name: 'test',
    });
    vf2 = await db.ValidFor.create({
      isReport: false,
      name: 'test2',
    });
  }));

  it('should create a validFor', async () => {
    expect(vf).toBeDefined();
    expect(vf.isReport).toBe(true);
    expect(vf.latestName).toBe('test');
    expect(vf.latestId).toBe(vf.id);

    expect(vf2).toBeDefined();
    expect(vf2.isReport).toBe(false);
    expect(vf2.latestName).toBe('test2');
  });

  afterAll((async () => {
    await db.ValidFor.destroy({ where: { id: vf.id } });
    await db.ValidFor.destroy({ where: { id: vf2.id } });
    await db.sequelize.close();
  }));
});
