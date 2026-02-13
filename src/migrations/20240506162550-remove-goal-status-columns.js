const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      ///
      // Remove these:
      //
      // +-------------------------+-------------+--------------------------+
      // |       column_name       | is_nullable |        data_type         |
      // +-------------------------+-------------+--------------------------+
      // | closeSuspendReason      | YES         | USER-DEFINED             |
      // | closeSuspendContext     | YES         | text                     |
      // | previousStatus          | YES         | text                     |
      // | firstNotStartedAt       | YES         | timestamp with time zone |
      // | lastNotStartedAt        | YES         | timestamp with time zone |
      // | firstInProgressAt       | YES         | timestamp with time zone |
      // | lastInProgressAt        | YES         | timestamp with time zone |
      // | firstCeasedSuspendedAt  | YES         | timestamp with time zone |
      // | lastCeasedSuspendedAt   | YES         | timestamp with time zone |
      // | firstClosedAt           | YES         | timestamp with time zone |
      // | lastClosedAt            | YES         | timestamp with time zone |
      // | firstCompletedAt        | YES         | timestamp with time zone |
      // | lastCompletedAt         | YES         | timestamp with time zone |
      // +-------------------------+-------------+--------------------------+
      await Promise.all([
        queryInterface.removeColumn('Goals', 'closeSuspendReason', { transaction }),
        queryInterface.removeColumn('Goals', 'closeSuspendContext', { transaction }),
        queryInterface.removeColumn('Goals', 'previousStatus', { transaction }),
        queryInterface.removeColumn('Goals', 'firstNotStartedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'lastNotStartedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'firstInProgressAt', { transaction }),
        queryInterface.removeColumn('Goals', 'lastInProgressAt', { transaction }),
        queryInterface.removeColumn('Goals', 'firstCeasedSuspendedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'lastCeasedSuspendedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'firstClosedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'lastClosedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'firstCompletedAt', { transaction }),
        queryInterface.removeColumn('Goals', 'lastCompletedAt', { transaction }),
      ])
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const { DataTypes } = Sequelize
      await Promise.all([
        queryInterface.addColumn(
          'Goals',
          'closeSuspendReason',
          {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'closeSuspendContext',
          {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'previousStatus',
          {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'firstNotStartedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'lastNotStartedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'firstInProgressAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'lastInProgressAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'firstCeasedSuspendedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'lastCeasedSuspendedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'firstClosedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'lastClosedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'firstCompletedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
        queryInterface.addColumn(
          'Goals',
          'lastCompletedAt',
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction }
        ),
      ])
    })
  },
}
