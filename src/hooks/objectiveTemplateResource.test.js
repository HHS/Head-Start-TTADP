import { faker } from '@faker-js/faker';
import {
  sequelize,
} from '../models';

import { CURATED_CREATION } from '../constants';

describe('objectiveTemplateResource hooks', () => {
  describe('afterDestroy', () => {
    const destroyUrl = faker.internet.url();
    let objectiveTemplateToDestroy;
    let resourceToDestroy;

    beforeAll(async () => {
      objectiveTemplateToDestroy = await sequelize.models.ObjectiveTemplate.create(
        {
          templateTitle: 'Orphan Objective Template Resource Test',
          hash: 'orphan-objective-template-resource-test',
          regionId: 1,
          creationMethod: CURATED_CREATION,
        },
      );

      resourceToDestroy = await sequelize.models.Resource.create({ url: destroyUrl });

      await sequelize.models.ObjectiveTemplateResource.create({
        objectiveTemplateId: objectiveTemplateToDestroy.id,
        resourceId: resourceToDestroy.id,
      });
    });

    afterAll(async () => {
      await sequelize.models.ObjectiveTemplateResource.destroy({
        where: { objectiveTemplateId: objectiveTemplateToDestroy.id },
      });

      await sequelize.models.ObjectiveTemplate.destroy({
        where: { id: objectiveTemplateToDestroy.id },
      });

      await sequelize.models.Resource.destroy({
        where: { url: destroyUrl },
        individualHooks: true,
      });

      // Close sequelize connection.
      await sequelize.close();
    });

    it('cleans up orphan resources', async () => {
      // Ensure resource exists.
      let resourceExists = await sequelize.models.Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resourceExists).not.toBeNull();

      // Delete objective template resource.
      await sequelize.models.ObjectiveTemplateResource.destroy({
        where: { objectiveTemplateId: objectiveTemplateToDestroy.id },
        individualHooks: true,
        force: true,
      });

      // Ensure resource is deleted.
      resourceExists = await sequelize.models.Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resourceExists).toBeNull();
    });
  });
});
