const { FEATURE_FLAGS } = require('../constants')
const { prepMigration } = require('../lib/migration')

const goalIds = [
  // Sunbeam Family Services Inc
  51128, // 06CH010877
  51130, // 06HP000332
  51131, // 06HP000478
  // Greater East Texas Community Action Program
  51095, // 06CH011568
  51096, // 06CH012011
  // Crossroads Youth & Family Services, Inc.
  66611, // 06CH012479
  // Lutheran Social Services of the South, Inc. dba Upbring
  51115, // 06CH010884
  51105, // 06CH011065
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await Promise.all(
        goalIds.map(async (goalId) =>
          queryInterface.sequelize.query(/* sql */ `
      UPDATE "Goals" g
      SET status = 'In Progress'
      WHERE g.id = ${goalId};
      `)
        )
      )

      // Prep for merging goals 51094 and 73270 for City of Albuquerque Early Head Start 06CH010672
      await queryInterface.sequelize.query(/* sql */ `
      UPDATE "ActivityReportGoals" arg
      SET source = 'Regional office priority'
      WHERE arg.id = 99676;
      `)
      await queryInterface.sequelize.query(/* sql */ `
      DELETE FROM "ActivityReportGoals" arg
      WHERE arg.id = 99685;
      `)
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await Promise.all(
        goalIds.map(async (goalId) =>
          queryInterface.sequelize.query(/* sql */ `
      UPDATE "Goals" g
      SET status = 'Closed'
      WHERE g.id = ${goalId};
      `)
        )
      )
    })
  },
}
