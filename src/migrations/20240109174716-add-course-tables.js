const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.createTable(
        'Courses',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          name: {
            allowNull: false,
            type: Sequelize.TEXT,
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
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
            defaultValue: null,
          },
          mapsTo: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Courses',
              },
              key: 'id',
            },
          },
        },
        {
          transaction,
        }
      )

      // Unique constraint on name.
      await queryInterface.sequelize.query(
        `
      ALTER TABLE "Courses"
      ADD CONSTRAINT "Courses_name_unique" UNIQUE ("name");
  `,
        { transaction }
      )

      await queryInterface.createTable(
        'ObjectiveCourses',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          objectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Objectives',
              },
              key: 'id',
            },
          },
          courseId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Courses',
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
        },
        {
          transaction,
        }
      )

      // Unique constraint on objectiveId, courseId.
      await queryInterface.sequelize.query(
        `
      ALTER TABLE "ObjectiveCourses"
      ADD CONSTRAINT "ObjectiveCourses_objectiveId_courseId_unique" UNIQUE ("objectiveId", "courseId");
  `,
        { transaction }
      )

      await queryInterface.createTable(
        'ActivityReportObjectiveCourses',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          activityReportObjectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'ActivityReportObjectives',
              },
              key: 'id',
            },
          },
          courseId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Courses',
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
        },
        {
          transaction,
        }
      )

      // Unique constraint on activityReportObjectiveId, courseId.
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "ActivityReportObjectiveCourses"
          ADD CONSTRAINT "ActivityReportObjectiveCourses_activityReportObjectiveId_courseId_unique" UNIQUE ("activityReportObjectiveId", "courseId");
      `,
        { transaction }
      )
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await removeTables(queryInterface, transaction, ['ActivityReportObjectiveCourses', 'ObjectiveCourses', 'Courses'])
    })
  },
}
