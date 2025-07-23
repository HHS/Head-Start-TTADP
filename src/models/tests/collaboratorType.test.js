import { CollaboratorType } from '..';

describe('CollaboratorType Model', () => {
  const instanceId1 = 1001;
  const instanceId2 = 1002;

  let instance;
  let mapsToInstance;

  beforeAll(async () => {
    mapsToInstance = await CollaboratorType.create({ name: 'Mapped Collaborator', validForId: 1 });
    instance = await CollaboratorType.create({ name: 'Original Collaborator', mapsTo: mapsToInstance.id, validForId: 1 });
    mapsToInstance = await CollaboratorType.create({ id: instanceId1, name: 'Mapped Collaborator', validForId: 1 });
    instance = await CollaboratorType.create({
      id: instanceId2, name: 'Original Collaborator', mapsTo: mapsToInstance.id, validForId: 1,
    });
  });

  afterAll(async () => {
    await CollaboratorType.destroy({ where: { id: [instanceId1, instanceId2] }, force: true });
  });

  it('should return correct latestName and latestId when mapsTo is not defined', () => {
    const newInstance = CollaboratorType.build({ name: 'Standalone Collaborator', validForId: 1 });
    expect(newInstance.latestName).toEqual('Standalone Collaborator');
    expect(newInstance.latestId).toBeNull();
  });
  it('should return correct latestName and latestId when mapsTo is defined', async () => {
    const newInstance = await CollaboratorType.findByPk(instance.id);
    expect(newInstance.latestName).toEqual('Mapped Collaborator');
    expect(newInstance.latestId).toEqual(mapsToInstance.id);
  });
});
