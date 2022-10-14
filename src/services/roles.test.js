import db, { Role } from '../models';
import {
  getAllRoles,
} from './roles';

describe('roles service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  let nonSpecialistRole1;
  let nonSpecialistRole2;
  let specialistRole1;

  describe('retrieveRoles', () => {
    beforeAll(async () => {
      [nonSpecialistRole1] = await Role.findOrCreate({
        where: {
          fullName: 'NSRT 1 name',
          name: 'NSRT 1',
          isSpecialist: false,
        },
      });
      [nonSpecialistRole2] = await Role.findOrCreate({
        where: {
          fullName: 'NSRT 2 name',
          name: 'NSRT 2',
          isSpecialist: false,
        },
      });
      [specialistRole1] = await Role.findOrCreate({
        where: {
          fullName: 'SRT 1 Name',
          name: 'SRT 1',
          isSpecialist: true,
        },
      });
    });

    afterAll(async () => {
      const rolesToDelete = [
        nonSpecialistRole1.id,
        nonSpecialistRole2.id,
        specialistRole1.id,
      ];
      await Role.destroy({
        where: {
          id: rolesToDelete,
        },
      });
    });

    it('Retrives all roles', async () => {
      const allRoles = await getAllRoles();
      const filteredRoles = allRoles.filter((r) => r.name.includes('SRT'));
      expect(filteredRoles.length).toBe(3);
    });

    it('retrieves only specialist roles', async () => {
      const allRoles = await getAllRoles(true);
      const filteredRoles = allRoles.filter((r) => r.name.includes('SRT'));
      expect(filteredRoles.length).toBe(1);
    });
  });
});
