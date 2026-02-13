const { prepMigration, addValuesToEnumIfTheyDontExist } = require('../lib/migration')
const { GOAL_CREATED_VIA } = require('../constants')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await addValuesToEnumIfTheyDontExist(queryInterface, transaction, 'enum_Goals_createdVia', GOAL_CREATED_VIA)

      await queryInterface.addColumn(
        'Objectives',
        'mapsToParentObjectiveId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'ActivityReportObjectives',
        'originalObjectiveId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        { transaction }
      )

      return queryInterface.addColumn(
        'ActivityReportGoals',
        'originalGoalId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Goals',
            },
            key: 'id',
          },
        },
        { transaction }
      )
    })
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.removeColumn('Objectives', 'mapsToParentObjectiveId', { transaction })
      await queryInterface.removeColumn('ActivityReportObjectives', 'originalObjectiveId', {
        transaction,
      })
      return queryInterface.removeColumn('ActivityReportGoals', 'originalGoalId', { transaction })
    })
  },
}
