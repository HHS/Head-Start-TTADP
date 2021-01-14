module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FileStatuses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      statusDescription: {
        type: Sequelize.STRING,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('FileStatuses');
  },
};
