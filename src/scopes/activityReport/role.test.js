import {
  ActivityReport,
  ActivityReportCollaborator,
  approvedReport,
  faker,
  filtersToScopes,
  Op,
  setupSharedTestData,
  sharedTestData,
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
    // ids are assigned by the database; explicit random ids collide with rows from other suites
    const possibleIds = [];
    const userIds = [];
    let collaboratorId;

    beforeAll(async () => {
      const granteeSpecialist = sharedTestData.roles['Grantee Specialist'];
      const systemSpecialist = sharedTestData.roles['System Specialist'];
      const grantsSpecialist = sharedTestData.roles['Grants Specialist'];

      const users = await Promise.all(
        [0, 1, 2].map(() => {
          const username = faker.string.uuid();
          return User.create({
            name: username,
            hsesUsername: username,
            hsesUserId: username,
            lastLogin: new Date(),
          });
        })
      );
      userIds.push(...users.map((u) => u.id));

      await UserRole.create({
        userId: userIds[0],
        roleId: granteeSpecialist.id,
      });

      await UserRole.create({
        userId: userIds[0],
        roleId: systemSpecialist.id,
      });

      await UserRole.create({
        userId: userIds[1],
        roleId: granteeSpecialist.id,
      });

      await UserRole.create({
        userId: userIds[2],
        roleId: grantsSpecialist.id,
      });

      const report0 = await ActivityReport.create({
        ...approvedReport,
        userId: userIds[0],
      });
      const report1 = await ActivityReport.create({
        ...approvedReport,
        userId: userIds[1],
      });
      const report2 = await ActivityReport.create({
        ...approvedReport,
        userId: userIds[2],
      });
      possibleIds.push(report0.id, report1.id, report2.id);

      const collaborator = await ActivityReportCollaborator.create({
        activityReportId: report1.id,
        userId: userIds[1],
      });
      collaboratorId = collaborator.id;
    });

    afterAll(async () => {
      await ActivityReportCollaborator.destroy({
        where: {
          id: collaboratorId,
        },
      });
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });

      await UserRole.destroy({
        where: {
          userId: userIds,
        },
      });

      await User.destroy({
        where: {
          id: userIds,
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
    const newRoleIds = [];
    const newRoleUserIds = [];

    beforeAll(async () => {
      const earlyChildhoodManager = sharedTestData.roles['Early Childhood Manager'];
      const granteeSpecialistManager = sharedTestData.roles['Grantee Specialist Manager'];
      const ttac = sharedTestData.roles.TTAC;

      // the second author has no matching role, used to confirm filtering
      const authorRoles = [earlyChildhoodManager, null, granteeSpecialistManager, ttac];

      for (const role of authorRoles) {
        const username = faker.string.uuid();
        const user = await User.create({
          name: username,
          hsesUsername: username,
          hsesUserId: username,
          lastLogin: new Date(),
        });
        newRoleUserIds.push(user.id);

        if (role) {
          await UserRole.create({ userId: user.id, roleId: role.id });
        }

        const report = await ActivityReport.create({ ...approvedReport, userId: user.id });
        newRoleIds.push(report.id);
      }
    });

    afterAll(async () => {
      await ActivityReport.destroy({ where: { id: newRoleIds } });
      await UserRole.destroy({ where: { userId: newRoleUserIds } });
      await User.destroy({ where: { id: newRoleUserIds } });
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

      expect(found.map((f) => f.id).sort((a, b) => a - b)).toStrictEqual(
        [newRoleIds[1], newRoleIds[2], newRoleIds[3]].sort((a, b) => a - b)
      );
    });

    it('finds reports for the Grantee Specialist Manager role', async () => {
      const filters = { 'role.in': ['Grantee Specialist Manager'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: newRoleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([newRoleIds[2]]);
    });

    it('finds reports for the TTAC role', async () => {
      const filters = { 'role.in': ['TTAC'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: newRoleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([newRoleIds[3]]);
    });
  });
});
