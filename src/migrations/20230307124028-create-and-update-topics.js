/* eslint-disable max-len */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      // Add new topic,
      await queryInterface.sequelize.query(
        `
            INSERT INTO "Topics"
            ("name", "createdAt", "updatedAt")
            VALUES
            ('Fatherhood / Male Caregiving', current_timestamp, current_timestamp);
          `,
        { transaction }
      )

      // Insert & Change existing topic.
      await queryInterface.sequelize.query(
        `
        INSERT INTO "Topics"
        ("name", "createdAt", "updatedAt")
        VALUES
        ('Ongoing Monitoring and Continuous Improvement', current_timestamp, current_timestamp);

        UPDATE "Topics" t1
        SET
            "mapsTo" = t2.id,
            "deletedAt" = current_timestamp
        FROM "Topics" t2
        WHERE t1.name = 'Ongoing Monitoring Management System'
        AND t2.name = 'Ongoing Monitoring and Continuous Improvement'
        AND t1."deletedAt" IS NULL;`,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      // Disable audit logging
      await queryInterface.sequelize.query(
        `
            SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
            `,
        { transaction }
      )

      // Revert topic to what it was before.
      await queryInterface.sequelize.query(
        `UPDATE "Topics"
        SET
            "mapsTo" = null,
            "deletedAt" = null
        WHERE name = 'Ongoing Monitoring Management System'
        AND "deletedAt" = (
            SELECT max("deletedAt")
            FROM "Topics"
            WHERE name = 'Ongoing Monitoring Management System');`,
        { transaction }
      )

      // Delete new topics.
      await queryInterface.sequelize.query(
        'DELETE FROM "Topics" WHERE "name" IN (\'Fatherhood / Male Caregiving\', \'Ongoing Monitoring and Continuous Improvement\');',
        { transaction }
      )

      // Enable audit logging
      await queryInterface.sequelize.query(
        `
            SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
            `,
        { transaction }
      )
    })
  },
}
