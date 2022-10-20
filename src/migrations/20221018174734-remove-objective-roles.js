/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.dropTable('ActivityReportObjectiveRoles', { transaction });
        await queryInterface.dropTable('ObjectiveRoles', { transaction });

        // Remove ZALActivityReportObjectiveRoles and functions.
        await queryInterface.dropTable('ZALActivityReportObjectiveRoles', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFActivityReportObjectiveRoles" ()', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFActivityReportObjectiveRoles" ()', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFActivityReportObjectiveRoles" ()', { transaction });

        // Remove ZALObjectiveRoles and functions.
        await queryInterface.dropTable('ZALObjectiveRoles', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFObjectiveRoles" ()', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFObjectiveRoles" ()', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFObjectiveRoles" ()', { transaction });
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.createTable('ObjectiveRoles', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          objectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Objectives',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          roleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Roles',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
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
        }, { transaction });

        await queryInterface.createTable('ActivityReportObjectiveRoles', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          activityReportObjectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'ActivityReportObjectives',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          roleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Roles',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
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
        }, { transaction });

        await queryInterface.addConstraint('"ActivityReportObjectiveRoles"', {
          fields: ['activityReportObjectiveId', 'roleId'],
          type: 'unique',
          transaction,
        });
      },
    );
  },
};
