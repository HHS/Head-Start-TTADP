const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(`

      -- Call the preexisting function for deduping args
      -- created in 20240520000000-merge_duplicate_args.js
      SELECT dedupe_args();

      -- The expected results look like:
      -- op_order |     op_name     | record_cnt
      ------------+-----------------+------------
      --        1 | relinked_argfrs |          0
      --        2 | deleted_argfrs  |          0
      --        3 | relinked_argrs  |          0
      --        4 | deleted_argrs   |          0
      --        5 | deleted_args    |         66
      SELECT
        1 op_order,
        'relinked_argfrs' op_name,
        COUNT(*) record_cnt
      FROM relinked_argfrs
      UNION SELECT 2, 'deleted_argfrs', COUNT(*) FROM deleted_argfrs
      UNION SELECT 3, 'relinked_argrs', COUNT(*) FROM relinked_argrs
      UNION SELECT 4, 'deleted_argrs', COUNT(*) FROM deleted_argrs
      UNION SELECT 5, 'deleted_args', COUNT(*) FROM deleted_args
      ORDER BY 1;
      `, { transaction });
    });
  },
  async down() {
    // rolling back merges and deletes would be a mess
  },
};
