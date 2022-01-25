module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.bulkUpdate('Users', {
        flags: [],
      }, {}, { transaction });
    },
  ),
  down: async () => {
    /**
     * Non-reversible
     */
  },
};
