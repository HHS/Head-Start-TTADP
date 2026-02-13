const { GOAL_SUSPEND_REASONS: SUSPEND_REASONS } = require('@ttahub/common')

const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return Promise.all([
        queryInterface.addColumn('Objectives', 'suspendReason', { type: Sequelize.DataTypes.ENUM(SUSPEND_REASONS) }, { transaction }),
        queryInterface.addColumn('Objectives', 'suspendContext', { type: Sequelize.TEXT }, { transaction }),
        queryInterface.addColumn('ActivityReportObjectives', 'suspendReason', { type: Sequelize.DataTypes.ENUM(SUSPEND_REASONS) }, { transaction }),
        queryInterface.addColumn('ActivityReportObjectives', 'suspendContext', { type: Sequelize.TEXT }, { transaction }),
      ])
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return Promise.all([
        queryInterface.removeColumn('Objectives', 'suspendReason', { transaction }),
        queryInterface.removeColumn('Objectives', 'suspendContext', { transaction }),
        queryInterface.removeColumn('ActivityReportObjectives', 'suspendReason', { transaction }),
        queryInterface.removeColumn('ActivityReportObjectives', 'suspendContext', { transaction }),
      ])
    })
  },
}
