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
        where: { name: 'Non Specialist Role 1' }, defaults: { isSpecialist: false },
      });
      [nonSpecialistRole2] = await Role.findOrCreate({
        where: { name: 'Non Specialist Role 2' }, defaults: { isSpecialist: false },
      });
      [specialistRole1] = await Role.findOrCreate({
        where: { name: 'Specialist Role 1' }, defaults: { isSpecialist: true },
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
      const filteredRoles = allRoles.filter((r) => r.name !== 'NC' && r.name !== 'CSC');
      expect(filteredRoles.length).toBe(3);
    });

    it('retrieves only specialist roles', async () => {
      const allRoles = await getAllRoles(true);
      expect(allRoles.length).toBe(1);
    });
  });
});
