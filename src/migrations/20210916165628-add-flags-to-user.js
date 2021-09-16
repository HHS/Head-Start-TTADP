const featureFlags = [
  'Feature 1',
  'Feature 2',
];

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.addColumn(
        'User',
        'flags',
        { type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(featureFlags)) },
        { transaction },
      );
    },
  ),

  down: async (queryInterface) => {
    await queryInterface.removeColumn('User', 'flags');
  },
};
