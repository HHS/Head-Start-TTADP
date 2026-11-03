const { prepMigration } = require('../lib/migration');

// "ZAFCreateAuditTruncateTable" (from 20220115000000-audit-system) generated ZALTruncateF*
// trigger functions with two bugs that made every TRUNCATE on an audited table fail:
// - the INSERT INTO "ZALDDL" was missing a comma after 'TRUNCATE', so Postgres concatenated the
//   adjacent literals and the INSERT had 8 values for 9 columns
// - the function had no RETURN, which PL/pgSQL requires of trigger functions
// This redefines the generator and rebuilds each existing truncate trigger. `fixed: false`
// reproduces the original definition for the down migration.
const generatorSql = (fixed) => `
  CREATE OR REPLACE FUNCTION "ZAFCreateAuditTruncateTable"(t_name varchar(63))
    RETURNS VOID
    LANGUAGE plpgsql AS
  $func$
  BEGIN
    EXECUTE format($sql$
        CREATE FUNCTION %I()
          RETURNS trigger
          LANGUAGE plpgsql AS
        $body$
        DECLARE
          CREATED_BY bigint;
          TRANSACTION_ID uuid;
          SESSION_SIG TEXT;
          DESCRIPTOR_ID int;
        BEGIN
          CREATED_BY := COALESCE(current_setting('var.loggedUser', true)::BIGINT, -1);

          TRANSACTION_ID := COALESCE(
              current_setting('var.transactionId', true)::uuid,
              lpad(txid_current()::text,32,'0')::uuid);

          SESSION_SIG := NULLIF(current_setting('audit.sessionSig', true), '')::TEXT;

          DESCRIPTOR_ID := "ZAFDescriptorToID"(
              NULLIF(current_setting('var.auditDescriptor', true)::TEXT, ''));

          RAISE NOTICE 'command_tag: %%','TRUNCATE';
          RAISE NOTICE 'object_type: %%','TABLE';
          RAISE NOTICE 'schema_name: %%','ttasmarthub';
          RAISE NOTICE 'object_identity: %%',%L;
          RAISE NOTICE 'ddl_timestamp: %%',CURRENT_TIMESTAMP;
          RAISE NOTICE 'ddl_by: %%',CREATED_BY;
          RAISE NOTICE 'ddl_txid: %%',TRANSACTION_ID;
          RAISE NOTICE 'descriptor_id: %%',DESCRIPTOR_ID;

          INSERT INTO "ZALDDL" (
            command_tag,
            object_type,
            schema_name,
            object_identity,
            ddl_timestamp,
            ddl_by,
            ddl_txid,
            session_sig,
            descriptor_id)
          VALUES (
            'TRUNCATE'${fixed ? ',' : ''}
            'TABLE',
            'ttasmarthub',
            %L,
            CURRENT_TIMESTAMP,
            CREATED_BY,
            TRANSACTION_ID,
            SESSION_SIG,
            DESCRIPTOR_ID);${fixed ? '\n          RETURN NULL;' : ''}
        END;
        $body$;$sql$,
        'ZALTruncateF' || t_name,
        t_name,
        t_name);

    EXECUTE format($sql$
        CREATE TRIGGER %I
          AFTER TRUNCATE ON %I
          FOR EACH STATEMENT EXECUTE FUNCTION %I()$sql$,
        'ZALTruncateT' || t_name,
        t_name,
        'ZALTruncateF' || t_name);
  END
  $func$;
`;

// Drop and regenerate the truncate trigger and function for every table that currently has one
const rebuildTruncateTriggersSql = `
  DO $$
  DECLARE
    t_name text;
  BEGIN
    FOR t_name IN
      SELECT c.relname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE t.tgname = 'ZALTruncateT' || c.relname
        AND NOT t.tgisinternal
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'ZALTruncateT' || t_name, t_name);
      EXECUTE format('DROP FUNCTION IF EXISTS %I()', 'ZALTruncateF' || t_name);
      PERFORM "ZAFCreateAuditTruncateTable"(t_name::varchar);
    END LOOP;
  END
  $$;
`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(generatorSql(true), { transaction });
      await queryInterface.sequelize.query(rebuildTruncateTriggersSql, { transaction });
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Restores the original (broken) generator and triggers
      await queryInterface.sequelize.query(generatorSql(false), { transaction });
      await queryInterface.sequelize.query(rebuildTruncateTriggersSql, { transaction });
    }),
};
