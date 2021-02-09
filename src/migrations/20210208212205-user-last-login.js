module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Users',
      'lastLogin',
      {
        defaultValue: Sequelize.fn('NOW'),
        allowNull: false,
        type: Sequelize.DATE,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Users', 'lastLogin');
  },
};
