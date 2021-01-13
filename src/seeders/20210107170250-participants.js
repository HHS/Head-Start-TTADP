const now = new Date().toISOString();

const grantees = [
  {
    id: 1,
    name: 'Stroman, Cronin and Boehm',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    name: 'Johnston-Romaguera',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 3,
    name: 'Stroman, Cronin and Boehm',
    createdAt: now,
    updatedAt: now,
  },
];

const grants = [
  {
    granteeId: 1,
    number: '14CH11111',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 1,
    number: '14CH22222',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 1,
    number: '14CH33333',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 2,
    number: '14CH44444',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 2,
    number: '14CH55555',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 2,
    number: '14CH66666',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 3,
    number: '14CH77777',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 3,
    number: '14CH88888',
    createdAt: now,
    updatedAt: now,
  },
  {
    granteeId: 3,
    number: '14CH99999',
    createdAt: now,
    updatedAt: now,
  },
];

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
    await queryInterface.bulkDelete('Grants', null, {});
    await queryInterface.bulkDelete('Grantees', null, {});
    await queryInterface.bulkDelete('NonGrantees', null, {});

    await queryInterface.bulkInsert('Grantees', grantees, {});
    await queryInterface.bulkInsert('Grants', grants, {});
    await queryInterface.bulkInsert('NonGrantees', nonGrantees, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Grants', null, {});
    await queryInterface.bulkDelete('Grantees', null, {});
    await queryInterface.bulkDelete('NonGrantees', null, {});
  },
};
