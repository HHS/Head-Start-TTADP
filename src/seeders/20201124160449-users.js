/* eslint-disable quotes */
const nowIso = () => new Date().toISOString();
const daysAgoIso = (days) => new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();

const SITE_ACCESS = 1;
const ADMIN = 2;
const READ_WRITE_REPORTS = 3;
const READ_REPORTS = 4;
const APPROVE_REPORTS = 5;

const staticUserPermissions = [
  {
    userId: 1,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 1,
    scopeId: READ_REPORTS,
    regionId: 14,
  },
  {
    userId: 1,
    regionId: 14,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 1,
    scopeId: ADMIN,
    regionId: 14,
  },
  {
    userId: 3,
    scopeId: SITE_ACCESS,
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
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 4,
    regionId: 3,
    scopeId: READ_WRITE_REPORTS,
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
  {
    userId: 5,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 5,
    regionId: 1,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 5,
    regionId: 1,
    scopeId: APPROVE_REPORTS,
  },
  {
    userId: 6,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 6,
    regionId: 2,
    scopeId: READ_REPORTS,
  },
  {
    userId: 6,
    regionId: 2,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 6,
    regionId: 3,
    scopeId: READ_REPORTS,
  },
  {
    userId: 6,
    regionId: 3,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 7,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 7,
    regionId: 1,
    scopeId: READ_REPORTS,
  },
  {
    userId: 7,
    regionId: 3,
    scopeId: READ_REPORTS,
  },
  {
    userId: 8,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 8,
    regionId: 1,
    scopeId: READ_REPORTS,
  },
  {
    userId: 8,
    regionId: 3,
    scopeId: READ_REPORTS,
  },
  {
    userId: 9,
    regionId: 14,
    scopeId: SITE_ACCESS,
  },
  {
    userId: 9,
    regionId: 3,
    scopeId: READ_REPORTS,
  },
];

const hsesUsernames = [
  'test.tta.adam',
  'test.tta.angela',
  'test.tta.christine',
  'test.tta.josh',
  'test.tta.kelly',
  'test.tta.krys',
  'test.tta.lauren',
  'test.tta.liz',
  'test.tta.mattb',
  'test.tta.matth',
  'test.tta.patrice',
  'test.tta.ryan',
  'test.tta.sarah-jaine',
];
const staticUsers = [
  {
    id: 1,
    email: 'hermionegranger@hogwarts.com',
    hsesUserId: '1',
    hsesUsername: 'hermionegranger@hogwarts.com',
    name: 'Hermione Granger',
    phoneNumber: '555-555-5550',
    homeRegionId: 1,
    lastLogin: nowIso(),
  },
  {
    id: 2,
    email: 'dumbledore@hogwarts.com',
    hsesUserId: '2',
    hsesUsername: 'dumbledore@hogwarts.com',
    name: undefined,
    phoneNumber: undefined,
    homeRegionId: undefined,
    lastLogin: daysAgoIso(190),
  },
  {
    id: 3,
    hsesUserId: '3',
    email: 'harrypotter@hogwarts.com',
    hsesUsername: 'harrypotter@hogwarts.com',
    name: 'Harry Potter',
    phoneNumber: '555-555-5551',
    homeRegionId: 2,
    lastLogin: nowIso(),
  },
  {
    id: 4,
    hsesUserId: '4',
    email: 'ronweasley@hogwarts.com',
    hsesUsername: 'ronweasley@hogwarts.com',
    name: 'Ron Weasley',
    phoneNumber: '555-555-5552',
    homeRegionId: 3,
    lastLogin: daysAgoIso(65),
  },
  {
    id: 5,
    hsesUserId: '5',
    email: 'cucumber@hogwarts.com',
    hsesUsername: 'cucumber@hogwarts.com',
    name: 'Cucumber User',
    phoneNumber: '555-555-5553',
    homeRegionId: 3,
    lastLogin: nowIso(),
  },
  {
    id: 6,
    hsesUserId: '6',
    email: 'larry@hogwarts.com',
    hsesUsername: 'larry@hogwarts.com',
    name: 'Larry Botter',
    phoneNumber: '555-555-5553',
    homeRegionId: 1,
    lastLogin: nowIso(),
  },
  {
    id: 7,
    hsesUserId: '7',
    email: 'christopher@chrestomanci.com',
    hsesUsername: 'christopher@chrestomanci.com',
    name: 'Christopher Chant',
    phoneNumber: '555-555-5554',
    homeRegionId: 3,
    lastLogin: nowIso(),
  },
  {
    id: 8,
    hsesUserId: '8',
    email: 'luz@hexside.com',
    hsesUsername: 'luz@hexside.com',
    name: 'Luz Noceda',
    phoneNumber: '555-555-5555',
    homeRegionId: 3,
    lastLogin: nowIso(),
  },
  {
    id: 9,
    hsesUserId: '9',
    email: 'rose@piranesi.com',
    hsesUsername: 'rose@piranesi.com',
    name: 'Piranesi',
    phoneNumber: '555-555-5555',
    homeRegionId: 3,
    lastLogin: nowIso(),
  },
];

const generatedUsers = hsesUsernames.map((u, i) => ({
  hsesUserId: `${i + 10}`,
  email: `${u}@test.com`,
  hsesUsername: u,
  name: u.split('.')[2],
  phoneNumber: '555-555-5554',
  homeRegionId: 1,
  lastLogin: nowIso(),
}));

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Users', staticUsers, {});
    await queryInterface.sequelize.query('ALTER SEQUENCE "Users_id_seq" RESTART WITH 10;');
    const generatedUserIds = await queryInterface.bulkInsert('Users', generatedUsers, { returning: ['id'] });
    await queryInterface.sequelize.query('ALTER SEQUENCE "Users_id_seq" RESTART WITH 100;');

    await queryInterface.bulkDelete('Roles', null, {});
    await queryInterface.bulkInsert('Roles', [
      {
        id: 11,
        name: 'ECS',
        fullName: 'Early Childhood Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 12,
        name: 'FES',
        fullName: 'Family Engagement Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 14,
        name: 'GS',
        fullName: 'Grantee Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 15,
        name: 'HS',
        fullName: 'Health Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 16,
        name: 'SS',
        fullName: 'System Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 9,
        name: 'AA',
        fullName: 'Admin. Assistant',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 10,
        name: 'ECM',
        fullName: 'Early Childhood Manager',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 13,
        name: 'GSM',
        fullName: 'Grantee Specialist Manager',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 4,
        name: 'PS',
        fullName: 'Program Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 1,
        name: 'RPM',
        fullName: 'Region Program Manager',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 3,
        name: 'SPS',
        fullName: 'Supervisory Program Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 8,
        name: 'TTAC',
        fullName: 'TTAC',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 5,
        name: 'GS',
        fullName: 'Grants Specialist',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: true,
      },
      {
        id: 7,
        name: 'OFS',
        fullName: 'Other Federal Staff',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 2,
        name: 'COR',
        fullName: 'COR',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 6,
        name: 'CO',
        fullName: 'Central Office',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 17,
        name: 'NC',
        fullName: 'National Center',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
      {
        id: 18,
        name: 'CSC',
        fullName: 'Customer Service Contact',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isSpecialist: false,
      },
    ]);

    await queryInterface.bulkInsert('UserRoles', [
      {
        userId: 1,
        roleId: 16,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        userId: 3,
        roleId: 5,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        userId: 4,
        roleId: 5,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        userId: 5,
        roleId: 5,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        userId: 6,
        roleId: 10,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        userId: 8,
        roleId: 17,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        userId: 9,
        roleId: 10,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      ...generatedUserIds.map(({ id: userId }) => ({
        userId,
        roleId: 5,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })),
    ]);

    const generatedUserPermissions = generatedUserIds.map(({ id }) => [
      {
        userId: id,
        scopeId: SITE_ACCESS,
        regionId: 14,
      },
      {
        userId: id,
        regionId: 14,
        scopeId: ADMIN,
      },
      {
        userId: id,
        regionId: 1,
        scopeId: READ_WRITE_REPORTS,
      },
      {
        userId: id,
        regionId: 1,
        scopeId: APPROVE_REPORTS,
      },
    ]);

    await queryInterface.bulkInsert('Permissions', staticUserPermissions, {});
    await queryInterface.bulkInsert('Permissions', generatedUserPermissions.flat(), {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Permissions', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};
