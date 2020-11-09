module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.createTable('Permissions', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    userId: {
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    regionId: {
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Regions',
        },
        key: 'id',
      },
    },
    scopeId: {
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Scopes',
        },
        key: 'id',
      },
    },
    // createdAt: {
    //   allowNull: false,
    //   type: Sequelize.DATE,
    // },
    // updatedAt: {
    //   allowNull: false,
    //   type: Sequelize.DATE,
    // },
  }),
  down: async (queryInterface) => queryInterface.dropTable('Permissions'),
};
