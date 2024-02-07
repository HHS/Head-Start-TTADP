module.exports = {
  up: (queryInterface) => queryInterface.bulkInsert(
    'Scopes',
    [
      {
        id: 6,
        name: 'UNLOCK_APPROVED_REPORTS',
        description: 'User can unlock approved reports, reverting the report to the needs action state.',
      },
    ],
    {
      ignoreDuplicates: true,
    },
  ),
  down: async (queryInterface) => {
    const query = 'DELETE FROM "Scopes" WHERE name = \'UNLOCK_APPROVED_REPORTS\'';
    await queryInterface.sequelize.query(query);
  },
};
