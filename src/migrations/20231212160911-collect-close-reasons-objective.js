const { CLOSE_SUSPEND_REASONS } = require('@ttahub/common')
const { prepMigration, addValuesToEnumIfTheyDontExist } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.renameColumn('Objectives', 'suspendReason', 'closeSuspendReason', {
        transaction,
      })
      await addValuesToEnumIfTheyDontExist(queryInterface, transaction, 'enum_Objectives_suspendReason', CLOSE_SUSPEND_REASONS)

      await queryInterface.renameColumn('Objectives', 'suspendContext', 'closeSuspendContext', {
        transaction,
      })
      await queryInterface.renameColumn('ActivityReportObjectives', 'suspendReason', 'closeSuspendReason', { transaction })
      await addValuesToEnumIfTheyDontExist(queryInterface, transaction, 'enum_ActivityReportObjectives_suspendReason', CLOSE_SUSPEND_REASONS)

      return queryInterface.renameColumn('ActivityReportObjectives', 'suspendContext', 'closeSuspendContext', { transaction })
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.renameColumn('Objectives', 'closeSuspendReason', 'suspendReason', {
        transaction,
      })
      await queryInterface.renameColumn('Objectives', 'closeSuspendContext', 'suspendContext', {
        transaction,
      })
      await queryInterface.renameColumn('Objectives', 'closeSuspendReason', 'suspendReason', {
        transaction,
      })
      return queryInterface.renameColumn('Objectives', 'closeSuspendContext', 'suspendContext', {
        transaction,
      })
    }),
}
