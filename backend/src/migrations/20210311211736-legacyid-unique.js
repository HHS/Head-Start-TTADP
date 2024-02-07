module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Make legacyId unique, so we can bulkCreate but not duplicate rows
     *
     */
    await queryInterface.changeColumn('ActivityReports', 'legacyId', { type: Sequelize.STRING, unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ActivityReports', 'legacyId', { type: Sequelize.STRING });
  },
};
