/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        const loggedUser = '0';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );

        // update isRttapa status on Goals table
        await queryInterface.sequelize.query(
          `UPDATE "Goals" g
          SET "isRttapa" = 'No'::"enum_Goals_isRttapa"
          WHERE COALESCE(g."isFromSmartsheetTtaPlan",false) = false;`,
          { transaction },
        );

        // update isRttapa status on ActivityReportGoals table
        await queryInterface.sequelize.query(
          `UPDATE "ActivityReportGoals" arg
          SET "isRttapa" = g."isRttapa"::"enum_ActivityReportGoals_isRttapa"
          FROM "Goals" g
          WHERE arg."goalId" = g.id
          AND arg."isRttapa" IS NULL
          AND g."isRttapa" IS NOT NULL;`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        const loggedUser = '0';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );

        // remove old column from users table
        await queryInterface.sequelize.query(
          `UPDATE "Goals" g
          SET "isRttapa" = null
          WHERE "isRttapa" = 'No'::"enum_Goals_isRttapa"
          AND COALESCE(g."isFromSmartsheetTtaPlan",false) = false;`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      },
    );
  },
};
