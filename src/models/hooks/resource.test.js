import {
  sequelize,
  Resource,
} from '..';
import { addToResourceQueue } from '../../services/resourceQueue';

jest.mock('../../services/resourceQueue', () => ({
  addToResourceQueue: jest.fn(),
}));

describe('resource hooks', () => {
  let resource;

  afterAll(async () => {
    await Resource.destroy({ where: { id: resource.id } });
    await sequelize.close();
  });

  describe('afterCreate', () => {
    it('should add resource to info queue', async () => {
      resource = await Resource.create({ url: 'https://www.test-resource-hooks.com' });
      expect(addToResourceQueue).toHaveBeenCalledWith(resource.id);
    });
  });
});
