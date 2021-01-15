const nonGrantees = [
  {
    name: 'CCDF / Child Care Administrator',
  },
  {
    name: 'Head Start Collaboration Office',
  },
  {
    name: 'QRIS System',
  },
  {
    name: 'Regional Head Start Association',
  },
  {
    name: 'Regional TTA/Other Specialists',
  },
  {
    name: 'State CCR&R',
  },
  {
    name: 'State Early Learning Standards',
  },
  {
    name: 'State Education System',
  },
  {
    name: 'State Health System',
  },
  {
    name: 'State Head Start Association',
  },
  {
    name: 'State Professional Development / Continuing Education',
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('NonGrantees', nonGrantees, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('NonGrantees', null, {});
  },
};
