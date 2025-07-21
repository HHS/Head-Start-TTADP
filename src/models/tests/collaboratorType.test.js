import { CollaboratorType, sequelize } from '..';

describe('CollaboratorType Model', () => {
  let instance;
  let mapsToInstance;
  let newInstance1;
  let newInstance2;
  // Generate unique timestamp for this test run to avoid collisions
  const uniqueSuffix = `_${Date.now()}`;

  beforeAll(async () => {
    // Use a transaction to ensure atomicity
    const t = await sequelize.transaction();
    // Create mapped instance with unique name
    mapsToInstance = await CollaboratorType.create(
      { name: `Mapped Collaborator${uniqueSuffix}`, validForId: 1 },
      { transaction: t },
    );

    // Create instance with unique name that maps to the first instance
    instance = await CollaboratorType.create(
      { name: `Original Collaborator${uniqueSuffix}`, mapsTo: mapsToInstance.id, validForId: 1 },
      { transaction: t },
    );

    // Commit the transaction
    await t.commit();
  });

  afterAll(async () => {
    await CollaboratorType.destroy({
      where: {
        id: [
          instance?.id,
          mapsToInstance?.id,
          newInstance1?.id,
          newInstance2?.id,
        ],
      },
      force: true,
    });
  });

  it('should return correct latestName and latestId when mapsTo is not defined', async () => {
    const standaloneName = `Standalone Collaborator${uniqueSuffix}`;
    newInstance1 = await CollaboratorType.create({ name: standaloneName, validForId: 1 });
    expect(newInstance1.latestName).toEqual(standaloneName);
    expect(newInstance1.latestId).toBe(newInstance1.id);
  });

  it('should return correct latestName and latestId when mapsTo is defined', async () => {
    newInstance2 = await CollaboratorType.findByPk(instance.id);
    expect(newInstance2.latestName).toEqual(`Mapped Collaborator${uniqueSuffix}`);
    expect(newInstance2.latestId).toEqual(mapsToInstance.id);
  });
});
