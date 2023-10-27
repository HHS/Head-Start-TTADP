import { syncGenericEnums } from '../generic';
import db from '../../../models';

describe('syncGenericEnums', () => {
  beforeAll(async () => {
    await db.isReady;
  });

  it('should throw an error if entity id is not valid', async () => {
    const entity = {
      name: 'Entity',
      id: null,
      type: 'EntityType',
    };

    const entityEnum = {
      model: {},
      alias: 'Alias',
    };

    await expect(syncGenericEnums(entity, entityEnum)).rejects.toThrowError(
      'id of Entity must be valid.',
    );
  });

  /* it('should create new enums if needed', async () => { */
  /*   const entity = { */
  /*     name: 'Entity', */
  /*     id: 1, */
  /*     type: 'STATUS', */
  /*   }; */
  /**/
  /*   const entityEnum = { */
  /*     model: { */
  /*       bulkCreate: jest.fn().mockResolvedValue([]), */
  /*       associations: { */
  /*         Status: { */
  /*           // target: db.Status, */
  /*           target: { */
  /*             primaryKeyAttribute: 'id', */
  /*             findAll: jest.fn().mockResolvedValue([]), */
  /*           }, */
  /*         }, */
  /*       }, */
  /*       findAll: jest.fn().mockResolvedValue([]), */
  /*     }, */
  /*     alias: 'Status', */
  /*     aliasId: 'StatusId', */
  /*   }; */
  /**/
  /*   const genericEnums = [ */
  /*     { id: 1 }, */
  /*     { id: 2 }, */
  /*     { id: 3 }, */
  /*   ]; */
  /**/
  /*   await syncGenericEnums(entity, entityEnum, genericEnums); */
  /**/
  /*   expect(entityEnum.model.bulkCreate).toHaveBeenCalled(); */
  /*   expect(entityEnum.model.bulkCreate).toHaveBeenCalledWith([ */
  /*     { AliasId: 1, Entity: 1 }, */
  /*     { AliasId: 2, Entity: 1 }, */
  /*     { AliasId: 3, Entity: 1 }, */
  /*   ], { individualHooks: true }); */
  /* }); */

  /* it('should update existing enums if needed', async () => { */
  /*   const entity = { */
  /*     name: 'Entity', */
  /*     id: 1, */
  /*     type: 'EntityType', */
  /*   }; */
  /**/
  /*   const entityEnum = { */
  /*     model: { */
  /*       update: jest.fn().mockResolvedValue(undefined), */
  /*     }, */
  /*     alias: 'Alias', */
  /*   }; */
  /**/
  /*   const genericEnums = [ */
  /*     { id: 1 }, */
  /*     { id: 2 }, */
  /*     { id: 3 }, */
  /*   ]; */
  /**/
  /*   await syncGenericEnums(entity, entityEnum, genericEnums); */
  /**/
  /*   expect(entityEnum.model.update).toHaveBeenCalledWith( */
  /*     { updatedAt: expect.any(Date) }, */
  /*     { */
  /*       where: { */
  /*         AliasId: [1, 2, 3], */
  /*         Entity: 1, */
  /*       }, */
  /*       individualHooks: true, */
  /*     }, */
  /*   ); */
  /* }); */

  /* it('should destroy unused enums if needed', async () => { */
  /*   const entity = { */
  /*     name: 'Entity', */
  /*     id: 1, */
  /*     type: 'EntityType', */
  /*   }; */
  /**/
  /*   const entityEnum = { */
  /*     model: { */
  /*       destroy: jest.fn().mockResolvedValue(undefined), */
  /*     }, */
  /*     alias: 'Alias', */
  /*   }; */
  /**/
  /*   const genericEnums = [ */
  /*     { id: 1 }, */
  /*     { id: 2 }, */
  /*     { id: 3 }, */
  /*   ]; */
  /**/
  /*   await syncGenericEnums(entity, entityEnum, genericEnums); */
  /**/
  /*   expect(entityEnum.model.destroy).toHaveBeenCalledWith({ */
  /*     where: { */
  /*       Entity: 1, */
  /*       AliasId: expect.arrayContaining([expect.not.arrayContaining([1, 2, 3])]), */
  /*     }, */
  /*     individualHooks: true, */
  /*   }); */
  /* }); */

  /* it('should return unmatched enums', async () => { */
  /*   const entity = { */
  /*     name: 'Entity', */
  /*     id: 1, */
  /*     type: 'EntityType', */
  /*   }; */
  /**/
  /*   const entityEnum = { */
  /*     model: {}, */
  /*     alias: 'Alias', */
  /*   }; */
  /**/
  /*   const genericEnums = [ */
  /*     { id: 1 }, */
  /*     { id: 2 }, */
  /*     { id: 3 }, */
  /*   ]; */
  /**/
  /*   const { unmatched } = await syncGenericEnums(entity, entityEnum, genericEnums); */
  /**/
  /*   expect(unmatched).toEqual(genericEnums); */
  /* }); */
});
