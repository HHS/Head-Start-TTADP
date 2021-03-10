const grants = [
  {
    id: 1,
    number: '14CH1234',
    regionId: 14,
    granteeId: 1,
  },
  {
    id: 2,
    number: '14CH10000',
    regionId: 14,
    granteeId: 2,
  },
  {
    id: 3,
    number: '14CH00001',
    regionId: 14,
    granteeId: 3,
  },
  {
    id: 4,
    number: '14CH00002',
    regionId: 14,
    granteeId: 4,
  },
  {
    id: 5,
    number: '14CH00003',
    regionId: 14,
    granteeId: 4,
  },
  {
    id: 6,
    number: '09CH011111',
    regionId: 9,
    granteeId: 5,
  },
  {
    id: 7,
    number: '09CH022222',
    regionId: 9,
    granteeId: 6,
  },
  {
    id: 8,
    number: '09CH033333',
    regionId: 9,
    granteeId: 7,
  },
  {
    id: 9,
    number: '09HP044444',
    regionId: 9,
    granteeId: 8,
  },
  {
    id: 10,
    number: '01HP044444',
    regionId: 1,
    granteeId: 9,
  },
  {
    id: 11,
    number: '01HP022222',
    regionId: 1,
    granteeId: 10,
  },
  {
    id: 12,
    number: '09HP01111',
    regionId: 1,
    granteeId: 11,
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Grants', grants, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Grants', null, {});
  },
};
