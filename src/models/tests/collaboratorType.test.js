import { CollaboratorType } from '..';

describe('CollaboratorType Model', () => {
  let instance;
  let mapsToInstance;

  beforeAll(async () => {
    mapsToInstance = await CollaboratorType.create({ name: 'Mapped Collaborator', validForId: 1 });
    instance = await CollaboratorType.create({ name: 'Original Collaborator', mapsTo: mapsToInstance.id, validForId: 1 });
  });

  it('should return correct latestName and latestId when mapsTo is not defined', () => {
    const newInstance = CollaboratorType.build({ name: 'Standalone Collaborator', validForId: 1 });
    expect(newInstance.latestName).toEqual('Standalone Collaborator');
    expect(newInstance.latestId).toBeNull();
  });
});
