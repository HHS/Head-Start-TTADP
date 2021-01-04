module.exports = {
  up: async (queryInterface, Sequelize) => {
    const value = { defaultValue: Sequelize.fn('NOW'), allowNull: false, type: Sequelize.DATE };

    await queryInterface.changeColumn('Users', 'createdAt', value);
    await queryInterface.changeColumn('Users', 'updatedAt', value);
    await queryInterface.changeColumn('Permissions', 'createdAt', value);
    await queryInterface.changeColumn('Permissions', 'updatedAt', value);
  },

  down: async (queryInterface, Sequelize) => {
    const value = { defaultValue: null, allowNull: false, type: Sequelize.DATE };

    await queryInterface.changeColumn('Users', 'createdAt', value);
    await queryInterface.changeColumn('Users', 'updatedAt', value);
    await queryInterface.changeColumn('Permissions', 'createdAt', value);
    await queryInterface.changeColumn('Permissions', 'updatedAt', value);
  },
};
