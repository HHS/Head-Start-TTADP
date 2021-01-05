const SCOPES = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_REPORTS: 3,
  READ_REPORTS: 4,
  APPROVE_REPORTS: 5,
};

const {
  ADMIN, READ_WRITE_REPORTS, READ_REPORTS, APPROVE_REPORTS,
} = SCOPES;

const permissions = [
  {
    userId: 1,
    scopeId: ADMIN,
    regionId: 14,
  },
  {
    userId: 3,
    regionId: 2,
    scopeId: READ_REPORTS,
  },
  {
    userId: 3,
    regionId: 2,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 3,
    regionId: 3,
    scopeId: READ_REPORTS,
  },
  {
    userId: 3,
    regionId: 3,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 4,
    regionId: 14,
    scopeId: ADMIN,
  },
  {
    userId: 4,
    regionId: 4,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 4,
    regionId: 4,
    scopeId: APPROVE_REPORTS,
  },
];

const users = [
  {
    id: 1,
    email: 'hermionegranger@hogwarts.com',
    hsesUserId: 1,
    role: 'System Specialist',
    name: 'Hermione Granger',
    phoneNumber: '555-555-5550',
    homeRegionId: 1,
  },
  {
    id: 2,
    email: 'dumbledore@hogwarts.com',
    hsesUserId: 2,
    role: undefined,
    name: undefined,
    phoneNumber: undefined,
    homeRegionId: undefined,
  },
  {
    id: 3,
    email: 'harrypotter@hogwarts.com',
    role: 'Grants Specialist',
    name: 'Harry Potter',
    phoneNumber: '555-555-5551',
    homeRegionId: 2,
  },
  {
    id: 4,
    email: 'ronweasley@hogwarts.com',
    role: 'Grants Specialist',
    name: 'Ron Weasley',
    phoneNumber: '555-555-5552',
    homeRegionId: 3,
  },
  {
    id: 999999,
    email: 'cucumber@hogwarts.com',
    role: 'Grants Specialist',
    name: 'Cucumber User',
    phoneNumber: '555-555-5553',
    homeRegionId: 3,
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Users', users, {});
    await queryInterface.bulkInsert('Permissions', permissions, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Permissions', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};
