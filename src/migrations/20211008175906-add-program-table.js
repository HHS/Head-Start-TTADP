module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Programs', {
      id: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      grantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Grants',
          },
          key: 'id',
        },
      },
      programType: {
        type: Sequelize.STRING,
      },
      startYear: {
        type: Sequelize.STRING,
      },
      startDate: {
        type: Sequelize.STRING,
      },
      endDate: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      name: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Grants');
  },
};
