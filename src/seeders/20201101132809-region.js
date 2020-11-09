module.exports = {
  up: (queryInterface) => queryInterface.bulkInsert('Regions', [
    {
      id: 1,
      name: 'Boston',
    },
    {
      id: 2,
      name: 'New York City',
    },
    {
      id: 3,
      name: 'Philadelphia',
    },
    {
      id: 4,
      name: 'Atlanta',
    },
    {
      id: 5,
      name: 'Chicago',
    },
    {
      id: 6,
      name: 'Dallas',
    },
    {
      id: 7,
      name: 'Kansas City',
    },
    {
      id: 8,
      name: 'Denver',
    },
    {
      id: 9,
      name: 'San Francisco',
    },
    {
      id: 10,
      name: 'Seattle',
    },
    {
      id: 11,
      name: 'AIAN',
    },
    {
      id: 12,
      name: 'MSHS',
    },
    {
      id: 13,
      name: 'Region 13',
    },
  ]),
  down: (queryInterface) => queryInterface.bulkDelete('Regions', null, {}),
};
