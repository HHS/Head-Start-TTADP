module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
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
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      try {
        // Delete duplicate goals based on trimmed_hashes, keeping the one with the lowest id
        await queryInterface.sequelize.query(`
          WITH duplicate_goals AS (
            SELECT
              id,
              ROW_NUMBER() OVER (PARTITION BY "goalTemplateId", MD5(TRIM(name)) ORDER BY id) AS row_num
            FROM "Goals"
          )
          DELETE FROM "Goals" WHERE id IN (SELECT id FROM duplicate_goals WHERE row_num > 1);
          `, { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  // Reverting the deletion is not possible, as the deleted records are lost
  down: () => {},
};