module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.bulkUpdate('Users', {
        flags: [],
      }, {}, { transaction });
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    // whoops, don't think this can be rolled back
  ),
};
