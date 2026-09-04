import {
  ActivityReport,
  ActivityReportCollaborator,
  approvedReport,
  faker,
  filtersToScopes,
  Op,
  Role,
  setupSharedTestData,
  tearDownSharedTestData,
  User,
  UserRole,
} from './testHelpers';

describe('role filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('role', () => {
    const possibleIds = [
      faker.number.int({ min: 0, max: 99999 }),
      faker.number.int({ min: 0, max: 99999 }),
      faker.number.int({ min: 0, max: 99999 }),
    ];

    beforeAll(async () => {
      const granteeSpecialist = await Role.findOne({ where: { fullName: 'Grantee Specialist' } });
      const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } });
      const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } });

      await User.create({
        id: possibleIds[0],
        name: 'u777',
        hsesUsername: 'u777',
        hsesUserId: '777',
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: possibleIds[0],
        roleId: granteeSpecialist.id,
      });

      await UserRole.create({
        userId: possibleIds[0],
        roleId: systemSpecialist.id,
      });

      await User.create({
        id: possibleIds[1],
        name: 'u778',
        hsesUsername: 'u778',
        hsesUserId: '778',
        role: ['Grantee Specialist'],
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: possibleIds[1],
        roleId: granteeSpecialist.id,
      });

      await User.create({
        id: possibleIds[2],
        name: 'u779',
        hsesUsername: 'u779',
        hsesUserId: '779',
        role: ['Grants Specialist'],
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: possibleIds[2],
        roleId: grantsSpecialist.id,
      });

      await ActivityReport.create({
        ...approvedReport,
        id: possibleIds[0],
        userId: possibleIds[0],
      });
      await ActivityReport.create({
        ...approvedReport,
        id: possibleIds[1],
        userId: possibleIds[1],
      });
      await ActivityReport.create({
        ...approvedReport,
        id: possibleIds[2],
        userId: possibleIds[2],
      });
      await ActivityReportCollaborator.create({
        id: possibleIds[0],
        activityReportId: possibleIds[1],
        userId: possibleIds[1],
      });
    });

    afterAll(async () => {
      await ActivityReportCollaborator.destroy({
        where: {
          id: possibleIds,
        },
      });
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });

      await UserRole.destroy({
        where: {
          userId: possibleIds,
        },
      });

      await User.destroy({
        where: {
          id: possibleIds,
        },
      });
    });
    it('finds reports based on author role', async () => {
      const filters = { 'role.in': ['System Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([possibleIds[0]]);
    });

    it('filters out reports based on author role', async () => {
      const filters = { 'role.nin': ['System Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id).sort()).toStrictEqual([possibleIds[1], possibleIds[2]].sort());
    });

    it('finds reports based on collaborator role', async () => {
      const filters = { 'role.in': ['Grantee Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual([possibleIds[0], possibleIds[1]].sort());
    });

    it('filters out reports based on collaborator role', async () => {
      const filters = { 'role.nin': ['Grantee Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual([possibleIds[2]].sort());
    });

    it('only allows valid roles to be passed', async () => {
      let filters = { 'role.in': ['DROP * FROM *'] };
      let scope = await filtersToScopes(filters);
      let found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual(possibleIds.sort());

      filters = { 'role.nin': ['Grantee Specialist & Potato Salesman'] };
      scope = await filtersToScopes(filters);
      found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual(possibleIds.sort());
    });
  });

  describe('newly added specialist roles', () => {
    const newRoleIds = [
      faker.number.int({ min: 0, max: 99999 }),
      faker.number.int({ min: 0, max: 99999 }),
    ];

    beforeAll(async () => {
      const earlyChildhoodManager = await Role.findOne({ where: { fullName: 'Early Childhood Manager' } });

      await User.create({
        id: newRoleIds[0],
        name: 'u780',
        hsesUsername: 'u780',
        hsesUserId: '780',
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: newRoleIds[0],
        roleId: earlyChildhoodManager.id,
      });

      await ActivityReport.create({
        ...approvedReport,
        id: newRoleIds[0],
        userId: newRoleIds[0],
      });

      // a report whose author has no matching role, used to confirm filtering
      await User.create({
        id: newRoleIds[1],
        name: 'u781',
        hsesUsername: 'u781',
        hsesUserId: '781',
        lastLogin: new Date(),
      });

      await ActivityReport.create({
        ...approvedReport,
        id: newRoleIds[1],
        userId: newRoleIds[1],
      });
    });

    afterAll(async () => {
      await ActivityReport.destroy({ where: { id: newRoleIds } });
      await UserRole.destroy({ where: { userId: newRoleIds } });
      await User.destroy({ where: { id: newRoleIds } });
    });

    it('finds reports for a newly added specialist role', async () => {
      const filters = { 'role.in': ['Early Childhood Manager'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: newRoleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([newRoleIds[0]]);
    });

    it('filters out reports for a newly added specialist role', async () => {
      const filters = { 'role.nin': ['Early Childhood Manager'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: newRoleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([newRoleIds[1]]);
    });
  });
});
