module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.addColumn(
        'Grants',
        'programSpecialistName',
        { type: Sequelize.DataTypes.STRING },
        { transaction },
      );
      await queryInterface.addColumn(
        'Grants',
        'programSpecialistEmail',
        { type: Sequelize.DataTypes.STRING },
        { transaction },
      );
      await queryInterface.addColumn(
        'Grants',
        'grantSpecialistName',
        { type: Sequelize.DataTypes.STRING },
        { transaction },
      );
      await queryInterface.addColumn(
        'Grants',
        'grantSpecialistEmail',
        { type: Sequelize.DataTypes.STRING },
        { transaction },
      );
    },
  ),

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Grants', 'programSpecialistName');
    await queryInterface.removeColumn('Grants', 'programSpecialistEmail');
    await queryInterface.removeColumn('Grants', 'grantSpecialistName');
    await queryInterface.removeColumn('Grants', 'grantSpecialistEmail');
  },
};
