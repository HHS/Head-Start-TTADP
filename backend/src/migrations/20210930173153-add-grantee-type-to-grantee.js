module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Grantees',
      'granteeType',
      {
        type: Sequelize.DataTypes.STRING,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Grantees', 'granteeType');
  },
};
