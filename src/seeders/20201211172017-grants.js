const { default: faker } = require('@faker-js/faker');
const { sample } = require('lodash');

const grants = [
  {
    id: 1,
    number: '14CH1234',
    regionId: 14,
    recipientId: 1,
    status: 'Active',
  },
  {
    id: 2,
    number: '14CH10000',
    regionId: 14,
    recipientId: 2,
    status: 'Active',
  },
  {
    id: 3,
    number: '14CH00001',
    regionId: 14,
    recipientId: 3,
    status: 'Active',
  },
  {
    id: 4,
    number: '14CH00002',
    regionId: 14,
    recipientId: 4,
    status: 'Active',
  },
  {
    id: 5,
    number: '14CH00003',
    regionId: 14,
    recipientId: 4,
    status: 'Active',
  },
  {
    id: 6,
    number: '09CH011111',
    regionId: 9,
    recipientId: 55,
    status: 'Active',
  },
  {
    id: 7,
    number: '09CH022222',
    regionId: 9,
    recipientId: 6,
    status: 'Active',
  },
  {
    id: 8,
    number: '09CH033333',
    regionId: 9,
    recipientId: 7,
    status: 'Active',
  },
  {
    id: 9,
    number: '09HP044444',
    regionId: 9,
    recipientId: 8,
    status: 'Active',
  },
  {
    id: 10,
    number: '01HP044444',
    regionId: 1,
    recipientId: 9,
    status: 'Active',
  },
  {
    id: 18,
    number: '01HP044445',
    regionId: 1,
    recipientId: 9,
    status: 'Active',
  },
  {
    id: 11,
    number: '01HP022222',
    regionId: 1,
    recipientId: 10,
    status: 'Inactive',
  },
  {
    id: 12,
    number: '09HP01111',
    regionId: 1,
    recipientId: 11,
    status: 'Active',
  },
  {
    id: 315,
    number: '09HP01111',
    regionId: 1,
    recipientId: 11,
    status: 'Active',
  },
];

const baseGrant = {
  startYear: 2021,
  startDate: '2021-01-01',
  status: 'Active',
  endDate: '2032-09-01',
};

const programTypes = [
  'Migrant HS',
  'Migrant EHS',
  'EHS',
  'HS',
  'AIAN HS',
  'AIAN EHS',
];

const programs = grants.map((grant) => ({
  ...baseGrant,
  name: faker.company.companyName(),
  id: grant.id,
  grantId: grant.id,
  programType: sample(programTypes),
}));

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Grants', grants, {});
    await queryInterface.bulkInsert('Programs', programs, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Programs', null, {});
    await queryInterface.bulkDelete('Grants', null, {});
  },
};
