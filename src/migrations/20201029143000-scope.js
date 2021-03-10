module.exports = {
  up: (queryInterface) => queryInterface.bulkInsert('Scopes', [
    {
      id: 1,
      name: 'SITE_ACCESS',
      description: 'User can login and view the TTAHUB site',
    },
    {
      id: 2,
      name: 'ADMIN',
      description: 'User can view the admin panel and change user permissions (including their own)',
    },
    {
      id: 3,
      name: 'READ_WRITE_REPORTS',
      description: 'Can view and create/edit reports in the region',
    },
    {
      id: 4,
      name: 'READ_REPORTS',
      description: 'Can view reports in the region',
    },
    {
      id: 5,
      name: 'APPROVE_REPORTS',
      description: 'Can approve reports',
    },
  ],
  {
    ignoreDuplicates: true,
  }),
  down: (queryInterface) => queryInterface.bulkDelete('Scopes', null, {}),
};
