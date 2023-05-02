import { Op } from 'sequelize';
import {
  sequelize,
  Resource,
} from '..';
import { afterCreate, afterUpdate } from './resource';
import { addGetResourceMetadataToQueue } from '../../services/resourceQueue';

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

  describe('afterUpdate', () => {
    let resourceWithTitle;
    let resourceWithoutTitle;

    afterAll(async () => {
      await Resource.destroy({
        where: { id: [resourceWithTitle.id, resourceWithoutTitle.id] },
        force: true,
      });
    });

    it('does not call addGetResourceMetadataToQueue when title is populated', async () => {
      resourceWithTitle = await Resource.create({
        url: 'https://www.resource-with-title.com',
        description: 'resource-with-title',
        title: 'resource-without-title',
      }, { individualHooks: false });

      addGetResourceMetadataToQueue.mockClear();

      await Resource.update({
        url: 'https://www.resource-with-title2.com',
      }, {
        where: { url: resourceWithTitle.url },
        individualHooks: true,
      });

      expect(addGetResourceMetadataToQueue).not.toHaveBeenCalled();
    });

    it('calls addGetResourceMetadataToQueue when title is not populated', async () => {
      resourceWithoutTitle = await Resource.create({
        url: 'https://www.resource-without-title.com',
        title: null,
      }, { individualHooks: false });

      addGetResourceMetadataToQueue.mockClear();

      await Resource.update({
        url: 'https://www.resource-without-title2.com',
      }, {
        where: { url: resourceWithoutTitle.url },
        individualHooks: true,
      });

      expect(addGetResourceMetadataToQueue).toHaveBeenCalledWith(resourceWithoutTitle.id, 'https://www.resource-without-title2.com');
    });
  });
});
