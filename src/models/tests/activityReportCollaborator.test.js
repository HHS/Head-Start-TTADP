import faker from '@faker-js/faker';
import db from '..';
import {
  createUser,
  createReport,
  destroyReport,
} from '../../testUtils';

const {
  ActivityReportCollaborator,
  Role,
  CollaboratorRole,
  User,
} = db;

describe('activityReportCollaborator', () => {
  let ar;
  let ar2;
  let user;
  let role;
  let arc1;
  let arc2;
  const roleName = faker.commerce.color()
    + faker.commerce.department()
    + faker.word.adjective()
    + faker.datatype.number(10);

  beforeAll(async () => {
    user = await createUser();
    ar = await createReport({ userId: user.id, activityRecipients: [] });
    ar2 = await createReport({ userId: user.id, activityRecipients: [] });
    await db.sequelize.query('ALTER SEQUENCE "Roles_id_seq" RESTART WITH 1000;');
    role = await Role.create({ name: roleName, fullName: roleName, isSpecialist: true });
    arc1 = await ActivityReportCollaborator.create({ userId: user.id, activityReportId: ar.id });
    arc2 = await ActivityReportCollaborator.create({ userId: user.id, activityReportId: ar2.id });
    await CollaboratorRole.create({ activityReportCollaboratorId: arc1.id, roleId: role.id });
  });

  afterAll(async () => {
    await CollaboratorRole.destroy({ where: { activityReportCollaboratorId: arc1.id } });
    await arc1.destroy();
    await arc2.destroy();
    await role.destroy();
    await destroyReport(ar2);
    await destroyReport(ar);
    await user.destroy();

    await db.sequelize.close();
  });

  it('should generate a full name based on the user and roles', async () => {
    const arc = await ActivityReportCollaborator.findByPk(arc1.id, {
      include: [{
        model: Role,
        as: 'roles',
      }, {
        model: User,
        as: 'user',
      }],
    });

    const { fullName } = arc;
    expect(fullName).toEqual(`${user.name}, ${roleName}`);
  });

  it('should generate a full name based on the user and roles when there are no roles', async () => {
    const arc = await ActivityReportCollaborator.findByPk(arc2.id, {
      include: [{
        model: Role,
        as: 'roles',
      }, {
        model: User,
        as: 'user',
      }],
    });

    const { fullName } = arc;
    expect(fullName).toEqual(`${user.name}`);
  });
});
