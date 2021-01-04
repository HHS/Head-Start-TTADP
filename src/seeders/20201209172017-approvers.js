const SCOPES = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_REPORTS: 3,
  READ_REPORTS: 4,
  APPROVE_REPORTS: 5,
};

const {
  READ_WRITE_REPORTS, APPROVE_REPORTS,
} = SCOPES;

const permissions = [
  {
    userId: 1,
    scopeId: READ_WRITE_REPORTS,
    regionId: 1,
  },
  {
    userId: 2,
    regionId: 1,
    scopeId: APPROVE_REPORTS,
  },
  {
    userId: 3,
    regionId: 1,
    scopeId: APPROVE_REPORTS,
  },
  {
    userId: 4,
    regionId: 2,
    scopeId: APPROVE_REPORTS,
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Permissions', permissions, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Permissions', null, {});
  },
};
