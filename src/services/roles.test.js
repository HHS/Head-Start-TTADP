import db, { Role } from '../models';
import { getAllRoles } from './roles';

describe('getAllRoles', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  it('gets all roles', async () => {
    const rolesRaw = await Role.findAll(
      {
        attributes: ['id', 'isSpecialist'],
      },
    );

    const rolesFromFunc = await getAllRoles();
    const specialists = await getAllRoles(true);

    expect(rolesRaw.length).toBe(rolesFromFunc.length);
    expect(specialists.length).toEqual(rolesRaw.filter((r) => r.isSpecialist).length);
  });
});
