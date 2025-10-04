const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */

module.exports = {

  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;

      await prepMigration(queryInterface, transaction, sessionSig);

      /** 1) Session report approver */
      // unlike the AR/CR, there can only be one approver,
      // so we can satisfy this by adding an approverId column to SessionReportPilots
      await queryInterface.addColumn(
        'SessionReportPilots',
        'approverId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );

      /** 2) Session report trainer */
      // new table, links SR has one or many Trainers,
      // each trainer links to a User
      await queryInterface.createTable('SessionReportPilotTrainers', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        sessionReportPilotId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'SessionReportPilots',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // Add unique constraint
      await queryInterface.addIndex(
        'SessionReportPilotTrainers',
        ['sessionReportPilotId', 'userId'],
        {
          unique: true,
          name: 'session_report_pilot_trainers_unique',
          transaction,
        },
      );

      /** 3) SessionReportPilotGrants */
      // new table remove from the data (JSONB) column
      // A session has one or many grants
      // each sessionReportPilotGrant links to a grant
      await queryInterface.createTable('SessionReportPilotGrants', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        sessionReportPilotId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'SessionReportPilots',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        grantId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Grants',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // Add unique constraint
      await queryInterface.addIndex(
        'SessionReportPilotGrants',
        ['sessionReportPilotId', 'grantId'],
        {
          unique: true,
          name: 'session_report_pilot_grants_unique',
          transaction,
        },
      );

      /** 4) Session report goal templates */
      // link a Session report to a goaltemplate
      // a training report can have one or more goal templates
      await queryInterface.createTable('SessionReportPilotGoalTemplates', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        sessionReportPilotId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'SessionReportPilots',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        goalTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'GoalTemplates',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // Add unique constraint
      await queryInterface.addIndex(
        'SessionReportPilotGoalTemplates',
        ['sessionReportPilotId', 'goalTemplateId'],
        {
          unique: true,
          name: 'session_report_pilot_goal_templates_unique',
          transaction,
        },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;

      await prepMigration(queryInterface, transaction, sessionSig);

      // Drop SessionReportPilotGoalTemplates table
      await queryInterface.dropTable('SessionReportPilotGoalTemplates', { transaction });

      // Drop SessionReportPilotGrants table
      await queryInterface.dropTable('SessionReportPilotGrants', { transaction });

      // Drop SessionReportPilotTrainers table
      await queryInterface.dropTable('SessionReportPilotTrainers', { transaction });

      // Remove approverId column from SessionReportPilots
      await queryInterface.removeColumn('SessionReportPilots', 'approverId', { transaction });
    });
  },

};
