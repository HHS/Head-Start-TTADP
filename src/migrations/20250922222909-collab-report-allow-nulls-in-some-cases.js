const { COLLAB_REPORT_PARTICIPANTS } = require('@ttahub/common')
const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.addColumn(
        'CollabReports',
        'participants',
        {
          allowNull: true,
          type: Sequelize.ARRAY(Sequelize.ENUM(COLLAB_REPORT_PARTICIPANTS)),
        },
        { transaction }
      )

      // Allow nulls for name field
      await queryInterface.changeColumn(
        'CollabReports',
        'name',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      )

      // Allow nulls for startDate field
      await queryInterface.changeColumn(
        'CollabReports',
        'startDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      )

      // Allow nulls for endDate field
      await queryInterface.changeColumn(
        'CollabReports',
        'endDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      )

      // Allow nulls for duration field
      await queryInterface.changeColumn(
        'CollabReports',
        'duration',
        {
          type: Sequelize.DOUBLE,
          allowNull: true,
          validate: {
            min: 0,
          },
        },
        { transaction }
      )

      // Allow nulls for conductMethod field - keep existing enum type
      await queryInterface.changeColumn(
        'CollabReports',
        'conductMethod',
        {
          type: '"enum_CollabReports_conductMethod"[]',
          allowNull: true,
        },
        { transaction }
      )

      // Allow nulls for description field
      await queryInterface.changeColumn(
        'CollabReports',
        'description',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      )

      // Make userId required (not null)
      await queryInterface.changeColumn(
        'CollabReports',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Revert name field to not allow nulls
      await queryInterface.changeColumn(
        'CollabReports',
        'name',
        {
          type: Sequelize.STRING,
          allowNull: false,
        },
        { transaction }
      )

      // Revert startDate field to not allow nulls
      await queryInterface.changeColumn(
        'CollabReports',
        'startDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        { transaction }
      )

      // Revert endDate field to not allow nulls
      await queryInterface.changeColumn(
        'CollabReports',
        'endDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        { transaction }
      )

      // Revert duration field to not allow nulls
      await queryInterface.changeColumn(
        'CollabReports',
        'duration',
        {
          type: Sequelize.DOUBLE,
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        { transaction }
      )

      // Revert conductMethod field to not allow nulls - keep existing enum type
      await queryInterface.changeColumn(
        'CollabReports',
        'conductMethod',
        {
          type: '"enum_CollabReports_conductMethod"[]',
          allowNull: false,
        },
        { transaction }
      )

      // Revert description field to not allow nulls
      await queryInterface.changeColumn(
        'CollabReports',
        'description',
        {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        { transaction }
      )

      // Revert userId to allow nulls
      await queryInterface.changeColumn(
        'CollabReports',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      )
    })
  },
}
