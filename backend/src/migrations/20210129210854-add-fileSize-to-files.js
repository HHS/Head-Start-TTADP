module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Files',
      'fileSize',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Files', 'fileSize');
  },
};
