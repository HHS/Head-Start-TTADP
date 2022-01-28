module.exports = {
  up: (queryInterface) => queryInterface.bulkInsert(
    'Scopes',
    [
      {
        id: 7,
        name: 'EDIT_LEGACY_REPORTS',
        description: 'User can edit some columns on the legacy reports.',
      },
    ],
    {
      ignoreDuplicates: true,
    },
  ),
  down: async (queryInterface) => {
    const query = 'DELETE FROM "Scopes" WHERE name = \'EDIT_LEGACY_REPORTS\'';
    await queryInterface.sequelize.query(query);
  },
};
