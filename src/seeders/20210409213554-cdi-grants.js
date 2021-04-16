const grants = [
  {
    id: 13,
    number: '13000000',
    regionId: 13,
    granteeId: 6,
    cdi: true,
    status: 'Active',
  },
  {
    id: 14,
    number: '13000001',
    regionId: 13,
    granteeId: 5,
    cdi: true,
    status: 'Active',
  },
  {
    id: 15,
    number: '13000002',
    regionId: 13,
    granteeId: 4,
    cdi: true,
    status: 'Active',
  },
  {
    id: 16,
    number: '13000003',
    regionId: 3,
    granteeId: 2,
    cdi: true,
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
