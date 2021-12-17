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
    recipientId: 5,
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
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Grants', grants, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Grants', null, {});
  },
};
