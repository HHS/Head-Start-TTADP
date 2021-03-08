module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.createTable('Objectives', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      goalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Goals',
          },
          key: 'id',
        },
      },
      title: {
        type: Sequelize.TEXT,
      },
      ttaProvided: {
        type: Sequelize.TEXT,
      },
      status: {
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

  down: (queryInterface) => queryInterface.dropTable('Objectives'),
};
