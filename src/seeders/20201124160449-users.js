/* eslint-disable quotes */
const moment = require('moment');
const sequelize = require('sequelize');

const SITE_ACCESS = 1;
const ADMIN = 2;
const READ_WRITE_REPORTS = 3;
const READ_REPORTS = 4;
const APPROVE_REPORTS = 5;

const permissions = [
  {
    userId: 1,
    scopeId: SITE_ACCESS,
    regionId: 14,
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
    userId: 6,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 6,
    regionId: 14,
    scopeId: ADMIN,
  },
  {
    userId: 6,
    regionId: 1,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 7,
    regionId: 1,
    scopeId: READ_WRITE_REPORTS,
  },
  {
    userId: 8,
    scopeId: SITE_ACCESS,
    regionId: 14,
  },
  {
    userId: 8,
    regionId: 14,
    scopeId: ADMIN,
  },
  {
    userId: 8,
    regionId: 1,
    scopeId: READ_WRITE_REPORTS,
  },
];

const users = [
  {
    id: 1,
    email: 'hermionegranger@hogwarts.com',
    hsesUserId: '1',
    hsesUsername: 'hermionegranger@hogwarts.com',
    role: sequelize.literal(`ARRAY['System Specialist']::"enum_Users_role"[]`),
    name: 'Hermione Granger',
    phoneNumber: '555-555-5550',
    homeRegionId: 1,
    lastLogin: moment().toISOString(),
  },
  {
    id: 2,
    email: 'dumbledore@hogwarts.com',
    hsesUserId: '2',
    hsesUsername: 'dumbledore@hogwarts.com',
    role: sequelize.literal('ARRAY[]::"enum_Users_role"[]'),
    name: undefined,
    phoneNumber: undefined,
    homeRegionId: undefined,
    lastLogin: moment().subtract(190, 'days').toISOString(),
  },
  {
    id: 3,
    hsesUserId: '3',
    email: 'harrypotter@hogwarts.com',
    hsesUsername: 'harrypotter@hogwarts.com',
    role: sequelize.literal(`ARRAY['Grants Specialist']::"enum_Users_role"[]`),
    name: 'Harry Potter',
    phoneNumber: '555-555-5551',
    homeRegionId: 2,
    lastLogin: moment().toISOString(),
  },
  {
    id: 4,
    hsesUserId: '4',
    email: 'ronweasley@hogwarts.com',
    hsesUsername: 'ronweasley@hogwarts.com',
    role: sequelize.literal(`ARRAY['Grants Specialist']::"enum_Users_role"[]`),
    name: 'Ron Weasley',
    phoneNumber: '555-555-5552',
    homeRegionId: 3,
    lastLogin: moment().subtract(65, 'days').toISOString(),
  },
  {
    id: 5,
    hsesUserId: '5',
    email: 'cucumber@hogwarts.com',
    hsesUsername: 'cucumber@hogwarts.com',
    role: sequelize.literal(`ARRAY['Grants Specialist']::"enum_Users_role"[]`),
    name: 'Cucumber User',
    phoneNumber: '555-555-5553',
    homeRegionId: 3,
    lastLogin: moment().toISOString(),
  },
  {
    id: 6,
    email: 'krystyna@adhocteam.us',
    hsesUsername: 'krystyna@adhocteam.us',
    // These hses ids will likely get out of date at some point, but
    // still nice to have this shortcut while it lasts
    hsesUserId: '50385',
    role: sequelize.literal(`ARRAY['Grants Specialist']::"enum_Users_role"[]`),
    name: 'Krys',
    phoneNumber: '555-555-5553',
    homeRegionId: 1,
    lastLogin: moment().toISOString(),
  },
  {
    id: 7,
    email: 'josh@adhocteam.us',
    hsesUsername: 'josh@adhocteam.us',
    role: sequelize.literal(`ARRAY['Grants Specialist']::"enum_Users_role"[]`),
    name: 'Josh',
    hsesUserId: '50154',
    phoneNumber: '555-555-5553',
    homeRegionId: 1,
    lastLogin: moment().toISOString(),
  },
  {
    id: 8,
    email: 'chuck.mcandrew@adhocteam.us',
    hsesUsername: 'chuck.mcandrew@adhocteam.us',
    role: sequelize.literal(`ARRAY['Grants Specialist']::"enum_Users_role"[]`),
    name: 'Chuck',
    hsesUserId: '50387',
    phoneNumber: '555-555-5553',
    homeRegionId: 1,
    lastLogin: moment().toISOString(),
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Users', users, {});
    await queryInterface.sequelize.query('ALTER SEQUENCE "Users_id_seq" RESTART WITH 10;');
    await queryInterface.bulkInsert('Permissions', permissions, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Permissions', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};
