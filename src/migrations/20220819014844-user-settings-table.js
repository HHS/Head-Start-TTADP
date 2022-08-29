module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'UserSettings',
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'Users' }, key: 'id' },
        },
        key: { allowNull: false, type: Sequelize.STRING },
        value: { allowNull: false, type: Sequelize.STRING },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      },
      { transaction },
    );

    await queryInterface.addIndex('UserSettings', ['userId', 'key'], { transaction });
  }),
  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('UserSettings', { transaction });
  }),
};
