module.exports = {
  up: (queryInterface) => queryInterface.bulkInsert(
    'NonGrantees',
    [
      { name: 'CCDF / Child Care Administrator' },
      { name: 'Head Start Collaboration Office' },
      { name: 'QRIS System' },
      { name: 'Regional Head Start Association' },
      { name: 'Regional TTA/Other Specialists' },
      { name: 'State CCR&R' },
      { name: 'State Early Learning Standards' },
      { name: 'State Education System' },
      { name: 'State Health System' },
      { name: 'State Head Start Association' },
      { name: 'State Professional Development / Continuing Education' },
    ],
    {
      ignoreDuplicates: true,
    },
  ),
  down: (queryInterface) => queryInterface.bulkDelete('NonGrantees', null, {}),
};
