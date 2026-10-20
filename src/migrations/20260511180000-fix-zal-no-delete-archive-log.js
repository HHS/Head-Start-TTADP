const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
        CREATE OR REPLACE FUNCTION "ZAFCreateALNoDelete"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          EXECUTE format($sql$
            CREATE OR REPLACE FUNCTION %I()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            DECLARE
              CREATED_BY bigint;
              TRANSACTION_ID uuid;
              SESSION_SIG TEXT;
              DESCRIPTOR_ID int;
            BEGIN
              CREATED_BY := COALESCE(NULLIF(current_setting('audit.loggedUser', true), '')::BIGINT, -1);

              TRANSACTION_ID := COALESCE(
                NULLIF(current_setting('audit.transactionId', true), '')::uuid,
                lpad(txid_current()::text,32, '0')::uuid);

              SESSION_SIG := NULLIF(current_setting('audit.sessionSig', true), '')::TEXT;

              DESCRIPTOR_ID := "ZAFDescriptorToID"(
                NULLIF(current_setting('audit.auditDescriptor', true)::TEXT, ''));

              IF ( DESCRIPTOR_ID = "ZAFDescriptorToID"('ARCHIVE AUDIT LOG') ) THEN
                RAISE NOTICE 'Archive Data: %% by %%', %L, CREATED_BY;

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
                  'ARCHIVE DATA',
                  'AUDIT LOG TABLE',
                  'ttasmarthub',
                  %L,
                  CURRENT_TIMESTAMP,
                  CREATED_BY,
                  TRANSACTION_ID,
                  SESSION_SIG,
                  DESCRIPTOR_ID);

                RETURN OLD;
              ELSE
                RAISE EXCEPTION 'Delete from %s is not supported to maintain audit log integrity.';
              END IF;
            END;
            $body$;$sql$,
            'ZALNoDeleteF' || t_name,
            'ZAL' || t_name,
            'ZAL' || t_name,
            'ZAL' || t_name);

          EXECUTE format($sql$
            DROP TRIGGER IF EXISTS %I ON %I$sql$,
            'ZALNoDeleteT' || t_name,
            'ZAL' || t_name);

          EXECUTE format($sql$
            CREATE TRIGGER %I
              BEFORE DELETE ON %I
              FOR EACH ROW EXECUTE FUNCTION %I()$sql$,
            'ZALNoDeleteT' || t_name,
            'ZAL' || t_name,
            'ZALNoDeleteF' || t_name);
        END
        $func$;

        DO
        $$
        DECLARE
          audit_table record;
        BEGIN
          FOR audit_table IN
            SELECT
              table_name,
              substring(table_name from 4) AS base_table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND table_name LIKE 'ZAL%'
            ORDER BY table_name
          LOOP
            PERFORM "ZAFCreateALNoDelete"(audit_table.base_table_name::varchar(63));
          END LOOP;
        END
        $$;
        `,
        { transaction }
      );
    });
  },

  async down() {
    // no rollback: this fixes broken generated audit-log trigger functions.
  },
};
