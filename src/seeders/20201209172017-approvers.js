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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    userId: 2,
    regionId: 1,
    scopeId: APPROVE_REPORTS,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    userId: 3,
    regionId: 1,
    scopeId: APPROVE_REPORTS,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    userId: 4,
    regionId: 2,
    scopeId: APPROVE_REPORTS,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const users = [
  {
    id: 1,
    email: 'test@gmail.com',
    hsesUserId: 1,
    role: 'Program Specialist',
    name: 'Hermione Granger',
    phoneNumber: '555-555-5550',
    homeRegionId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    email: 'harrypotter@hogwarts.com',
    role: 'Program Specialist',
    name: 'Harry Potter',
    phoneNumber: '555-555-5551',
    homeRegionId: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    email: 'ronweasley@hogwarts.com',
    role: 'Program Specialist',
    name: 'Ron Weasley',
    phoneNumber: '555-555-5552',
    homeRegionId: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    email: 'cucumber@hogwarts.com',
    role: 'Program Specialist',
    name: 'Cucumber User',
    phoneNumber: '555-555-5553',
    homeRegionId: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
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
