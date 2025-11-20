const AUDIT_SETTINGS_SQL = `
  SELECT
    set_config('audit.loggedUser', '0', TRUE) as "loggedUser",
    set_config('audit.transactionId', NULL, TRUE) as "transactionId",
    set_config('audit.sessionSig', :sessionSig, TRUE) as "sessionSig",
    set_config('audit.auditDescriptor', 'RUN MIGRATIONS', TRUE) as "auditDescriptor";
`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(AUDIT_SETTINGS_SQL, {
      transaction,
      replacements: { sessionSig: __filename },
    });

    return queryInterface.sequelize.query(`
      UPDATE "CommunicationLogs"
      SET data = jsonb_set(
        data,
        '{notes}',
        to_jsonb(
          CASE
            WHEN data ->> 'notes' IS NULL OR data ->> 'notes' = '' THEN data ->> 'notes'
            WHEN (data ->> 'notes') ~ '<[a-zA-Z/][^>]*>' THEN data ->> 'notes'
            ELSE CONCAT(
              '<p>',
              regexp_replace(
                replace(
                  replace(
                    replace(
                      data ->> 'notes',
                      '&',
                      '&amp;'
                    ),
                    '<',
                    '&lt;'
                  ),
                  '>',
                  '&gt;'
                ),
                E'(\\r\\n|\\n|\\r)',
                '<br />',
                'g'
              ),
              '</p>'
            )
          END
        ),
        true
      )
      WHERE data ? 'notes';
    `, { transaction });
  }),

  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(AUDIT_SETTINGS_SQL, {
      transaction,
      replacements: { sessionSig: __filename },
    });

    return queryInterface.sequelize.query(`
      UPDATE "CommunicationLogs"
      SET data = jsonb_set(
        data,
        '{notes}',
        to_jsonb(
          CASE
            WHEN data ->> 'notes' IS NULL OR data ->> 'notes' = '' THEN data ->> 'notes'
            ELSE trim(
              BOTH FROM regexp_replace(
                regexp_replace(
                  regexp_replace(
                    data ->> 'notes',
                    '<br\\s*/?>',
                    E'\\n',
                    'gi'
                  ),
                  '<[^>]+>',
                  '',
                  'g'
                ),
                '&nbsp;',
                ' ',
                'gi'
              )
            )
          END
        ),
        true
      )
      WHERE data ? 'notes';
    `, { transaction });
  }),
};
