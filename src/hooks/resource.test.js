import {
  sequelize,
  Resource,
} from '../models';
import { addGetResourceMetadataToQueue } from '../services/resourceQueue';

jest.mock('bull');

// Mock addGetResourceMetadataToQueue.
jest.mock('../../services/resourceQueue', () => ({
  addGetResourceMetadataToQueue: jest.fn(),
}));

describe('objectiveTopic hooks', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  describe('afterCreate', () => {
    let newResource;

    afterEach(async () => {
      // reset mocks.
      addGetResourceMetadataToQueue.mockClear();
    });
    afterAll(async () => {
      await Resource.destroy({
        where: { id: [newResource.id] },
        force: true,
      });
    });

    it('calls addGetResourceMetadataToQueue when title is missing on create', async () => {
      newResource = await Resource.create({
        url: 'https://www.resource-with-title.com',
        title: null,
        description: 'resource-with-title',
        individualHooks: true,
      });
      expect(addGetResourceMetadataToQueue).toHaveBeenCalledWith(newResource.id, 'https://www.resource-with-title.com');
    });
  });
});
