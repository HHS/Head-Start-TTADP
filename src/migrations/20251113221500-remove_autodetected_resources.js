const { SOURCE_FIELD } = require('../constants');

const AUDIT_SETTINGS_SQL = `
  SELECT
    set_config('audit.loggedUser', '0', TRUE) AS "loggedUser",
    set_config('audit.transactionId', NULL, TRUE) AS "transactionId",
    set_config('audit.sessionSig', :sessionSig, TRUE) AS "sessionSig",
    set_config('audit.auditDescriptor', 'RUN MIGRATIONS', TRUE) AS "auditDescriptor";
`;

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(AUDIT_SETTINGS_SQL, {
      transaction,
      replacements: {
        sessionSig: __filename,
      },
    });

    const deletions = [
      {
        table: 'ActivityReportResources',
        keepFields: [
          SOURCE_FIELD.REPORT.RESOURCE,
          SOURCE_FIELD.REPORT.ECLKC,
          SOURCE_FIELD.REPORT.NONECLKC,
        ],
      },
      {
        table: 'GoalResources',
        keepFields: [SOURCE_FIELD.GOAL.RESOURCE],
      },
      {
        table: 'ActivityReportObjectiveResources',
        keepFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
      },
      {
        table: 'NextStepResources',
        keepFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
      },
    ];

    await Promise.all(deletions.map(({ table, keepFields = [] }) => {
      if (!keepFields.length) {
        throw new Error(`Missing keepFields definition for ${table}`);
      }
      const fieldsToKeep = keepFields;
      const whereClause = fieldsToKeep
        .map((field) => `NOT ('${field}' = ANY("sourceFields"))`)
        .join(' AND ');

      return queryInterface.sequelize.query(`
        DELETE FROM "${table}"
        WHERE ${whereClause};
      `, { transaction });
    }));
  }),
  down: async () => Promise.resolve(),
};
