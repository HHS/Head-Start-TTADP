module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('CollaboratorRoles', {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    activityReportCollaboratorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ActivityReportCollaborators',
        },
        key: 'id',
      },
    },
    role: {
      allowNull: false,
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
  }),
  down: (queryInterface) => queryInterface.dropTable('CollaboratorRoles'),
};
