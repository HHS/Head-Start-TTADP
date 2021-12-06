const recipients = [
  {
    id: 1,
    name: 'Recipient Name',
  },
  {
    id: 2,
    name: 'Stroman, Cronin and Boehm',
  },
  {
    id: 3,
    name: 'Jakubowski-Keebler',
  },
  {
    id: 4,
    name: 'Johnston-Romaguera',
  },
  {
    id: 5,
    name: 'Agency 1, Inc.',
  },
  {
    id: 6,
    name: 'Agency 2, Inc.',
  },
  {
    id: 7,
    name: 'Agency 3, Inc.',
  },
  {
    id: 8,
    name: 'Agency 4, Inc.',
  },
  {
    id: 9,
    name: 'Agency 1.a in region 1, Inc.',
  },
  {
    id: 10,
    name: 'Agency 1.b in region 1, Inc.',
  },
  {
    id: 11,
    name: 'Agency 2 in region 1, Inc.',
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Recipients', recipients, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Recipients', null, {});
  },
};
