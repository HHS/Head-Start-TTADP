module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('RequestErrors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      operation: {
        type: Sequelize.STRING,
      },
      uri: {
        type: Sequelize.STRING,
      },
      method: {
        type: Sequelize.STRING,
      },
      requestBody: {
        type: Sequelize.JSON,
      },
      responseBody: {
        type: Sequelize.JSON,
      },
      responseCode: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('RequestErrors');
  },
};
