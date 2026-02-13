const grants = [
  {
    id: 13,
    number: '13000000',
    regionId: 13,
    recipientId: 6,
    cdi: true,
    status: 'Active',
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 14,
    number: '13000001',
    regionId: 13,
    recipientId: 55,
    cdi: true,
    status: 'Active',
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 15,
    number: '13000002',
    regionId: 13,
    recipientId: 4,
    cdi: true,
    status: 'Active',
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 16,
    number: '13000003',
    regionId: 3,
    recipientId: 2,
    cdi: true,
    status: 'Active',
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 17,
    number: '13000004',
    regionId: 3,
    recipientId: 2,
    cdi: true,
    status: 'Inactive',
    startDate: new Date(),
    endDate: new Date(),
  },
]

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Grants', grants, {})
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Grants', null, {})
  },
}
