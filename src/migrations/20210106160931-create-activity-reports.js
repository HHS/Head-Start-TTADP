module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ActivityReports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      resourcesUsed: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      additionalNotes: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      numberOfParticipants: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },
      deliveryMethod: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      duration: {
        allowNull: true,
        type: Sequelize.DECIMAL(3, 1),
      },
      endDate: {
        allowNull: true,
        type: Sequelize.DATEONLY,
      },
      startDate: {
        allowNull: true,
        type: Sequelize.DATEONLY,
      },
      participantType: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      requester: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      targetPopulations: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING),
      },
      reason: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING),
      },
      participants: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING),
      },
      topics: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING),
      },
      ttaType: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING),
      },
      pageState: {
        allowNull: true,
        type: Sequelize.JSON,
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Users',
          },
          key: 'id',
        },
      },
      lastUpdatedById: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Users',
          },
          key: 'id',
        },
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
    await queryInterface.dropTable('ActivityReports');
  },
};
