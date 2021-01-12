const grantees = [
  {
    id: 1,
    name: 'Grantee Name',
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
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Grantees', grantees, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Grantees', null, {});
  },
};
