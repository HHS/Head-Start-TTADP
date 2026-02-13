/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
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

      // Disable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        DROP FUNCTION IF EXISTS "ZAFAddAuditingOnTable"(varchar(63));
        `,
        { transaction }
      )

      // Modify creation function to make creation of audit log table optional
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFAddAuditingOnTable"(t_name varchar(63), t_create_audit_table boolean DEFAULT true)
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          RAISE NOTICE 'Adding Auditing on %', t_name;

          -- Only create the AL table when t_create_audit_table is true
          IF t_create_audit_table THEN
            PERFORM "ZAFCreateALTable"(t_name);
          END IF;

          PERFORM "ZAFCreateALFunction"(t_name);
          PERFORM "ZAFCreateALTrigger"(t_name);
          PERFORM "ZAFCreateAuditTruncateTable"(t_name);
          PERFORM "ZAFCreateALNoUpdate"(t_name);
          PERFORM "ZAFCreateALNoDelete"(t_name);
          PERFORM "ZAFCreateALNoTruncate"(t_name);
        END
        $func$;`,
        { transaction }
      )

      // Updating the audit log function to record the impersonation ID.
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALFunction"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          EXECUTE format($sql$
              CREATE OR REPLACE FUNCTION %I ()
                RETURNS trigger
                LANGUAGE plpgsql AS
                $body$
                DECLARE
                    CREATED_BY bigint;
                    IMPERSONATING bigint;
                    TRANSACTION_ID uuid;
                    SESSION_SIG TEXT;
                    DESCRIPTOR_ID int;
                    UNIQUE_OLD jsonb;
                    UNIQUE_NEW jsonb;
                    IS_LOGGABLE boolean;
                BEGIN
                    CREATED_BY := COALESCE(NULLIF(current_setting('audit.loggedUser', true),'')::BIGINT, -1);
                    IMPERSONATING := COALESCE(NULLIF(current_setting('audit.impersonationUserId', true),'')::BIGINT, -1);

                    TRANSACTION_ID := COALESCE(
                        NULLIF(current_setting('audit.transactionId', true),'')::uuid,
                        lpad(txid_current()::text,32,'0')::uuid);

                    SESSION_SIG := NULLIF(current_setting('audit.sessionSig', true), '')::TEXT;

                    DESCRIPTOR_ID := "ZAFDescriptorToID"(
                        NULLIF(current_setting('audit.auditDescriptor', true), '')::TEXT);

                    IF (TG_OP = 'INSERT') THEN
                        INSERT INTO %I (
                            data_id,
                            old_row_data,
                            new_row_data,
                            dml_type,
                            dml_timestamp,
                            dml_by,
                            dml_as,
                            dml_txid,
                            session_sig,
                            descriptor_id
                        )
                        VALUES(
                            NEW.id,
                            null,
                            to_jsonb(NEW),
                            'INSERT',
                            CURRENT_TIMESTAMP,
                            CREATED_BY,
                            IMPERSONATING,
                            TRANSACTION_ID,
                            SESSION_SIG,
                            DESCRIPTOR_ID
                        );

                        RETURN NEW;
                    ELSIF (TG_OP = 'UPDATE') THEN
                        SELECT
                        json_object(array_agg(a."columnName"),array_agg(a.pre_value)) AS pre,
                        json_object(array_agg(a."columnName"),array_agg(a.post_value)) AS post,
                        (count(trigerable) - count(NULLIF(trigerable,TRUE)) > 0) AS loggable
                        INTO
                        UNIQUE_OLD,
                        UNIQUE_NEW,
                        IS_LOGGABLE
                        FROM (
                            SELECT
                            pre.key AS "columnName",
                            pre.value #>> '{}' AS pre_value,
                            post.value #>> '{}' AS post_value,
                            NOT COALESCE(filter."columnName" = filter."columnName",FALSE) as trigerable
                            FROM jsonb_each(to_jsonb(OLD)) AS pre
                            INNER JOIN jsonb_each(to_jsonb(NEW)) AS post
                            ON pre.key = post.key
                            AND pre.value IS DISTINCT FROM post.value
                            LEFT JOIN "ZAFilter" filter
                            ON pre.key = filter."columnName"
                            and ( filter."tableName" = %L OR filter."tableName" IS NULL)
                        ) a;

                        IF IS_LOGGABLE THEN
                        INSERT INTO %I (
                            data_id,
                            old_row_data,
                            new_row_data,
                            dml_type,
                            dml_timestamp,
                            dml_by,
                            dml_as,
                            dml_txid,
                            session_sig,
                            descriptor_id
                        )
                        VALUES(
                            NEW.id,
                            UNIQUE_OLD,
                            UNIQUE_NEW,
                            'UPDATE',
                            CURRENT_TIMESTAMP,
                            CREATED_BY,
                            IMPERSONATING,
                            TRANSACTION_ID,
                            SESSION_SIG,
                            DESCRIPTOR_ID
                        );
                        END IF;
                        RETURN NEW;
                    ELSIF (TG_OP = 'DELETE') THEN
                    INSERT INTO %I (
                        data_id,
                        old_row_data,
                        new_row_data,
                        dml_type,
                        dml_timestamp,
                        dml_by,
                        dml_as,
                        dml_txid,
                        session_sig,
                        descriptor_id
                    )
                    VALUES(
                        OLD.id,
                        to_jsonb(OLD),
                        null,
                        'DELETE',
                        CURRENT_TIMESTAMP,
                        CREATED_BY,
                        IMPERSONATING,
                        TRANSACTION_ID,
                        SESSION_SIG,
                        DESCRIPTOR_ID
                    );

                    RETURN OLD;
                    END IF;

                END;
                $body$;$sql$,
              'ZALF' || t_name,
              'ZAL' || t_name,
              t_name,
              'ZAL' || t_name,
              'ZAL' || t_name);
        END
        $func$;`,
        { transaction }
      )

      // Updating the audit log function to record the impersonation ID.
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALTable"(t_name varchar(63))
            RETURNS VOID
            LANGUAGE plpgsql AS
          $func$
          BEGIN
            RAISE NOTICE 'Create Audit Log Table: %','ZAL' || t_name;
            EXECUTE format($sql$
                CREATE TABLE IF NOT EXISTS %I (
                  id BIGSERIAL,
                  data_id bigint NOT NULL,
                  dml_type dml_type NOT NULL,
                  old_row_data jsonb,
                  new_row_data jsonb,
                  dml_timestamp timestamp NOT NULL,
                  dml_by bigint NOT NULL,
                  dml_as bigint NOT NULL,
                  dml_txid uuid NOT NULL,
                  session_sig TEXT NULL,
                  descriptor_id INT,
                  PRIMARY KEY (id)
                  );$sql$,
                  'ZAL' || t_name);
          END
          $func$;`,
        { transaction }
      )

      // Modify removal function to remove triggers on auditing table
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFRemoveAuditingOnTable"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          EXECUTE format($sql$
              DROP TRIGGER IF EXISTS %I
                ON %I$sql$,
              'ZALT' || t_name,
              t_name);

          EXECUTE format($sql$
              DROP FUNCTION IF EXISTS %I()$sql$,
              'ZALF' || t_name);

          EXECUTE format($sql$
              DROP TRIGGER IF EXISTS %I
                ON %I$sql$,
              'ZALTruncateT' || t_name,
              t_name);

          EXECUTE format($sql$
              DROP FUNCTION IF EXISTS %I()$sql$,
              'ZALTruncateF' || t_name);

          EXECUTE format($sql$
              DROP TRIGGER IF EXISTS %I
                ON %I$sql$,
              'ZALNoTruncateT' || t_name,
              'ZAL' || t_name);

          EXECUTE format($sql$
              DROP FUNCTION IF EXISTS %I()$sql$,
              'ZALNoTruncateF' || t_name);

          EXECUTE format($sql$
              DROP TRIGGER IF EXISTS %I
                ON %I$sql$,
              'ZALNoDeleteT' || t_name,
              'ZAL' || t_name);

          EXECUTE format($sql$
              DROP FUNCTION IF EXISTS %I()$sql$,
              'ZALNoDeleteF' || t_name);

          EXECUTE format($sql$
              DROP TRIGGER IF EXISTS %I
                ON %I$sql$,
              'ZALNoUpdateT' || t_name,
              'ZAL' || t_name);

          EXECUTE format($sql$
              DROP FUNCTION IF EXISTS %I()$sql$,
              'ZALNoUpdateF' || t_name);
        END
        $func$;`,
        { transaction }
      )

      // Remove the current audit system from all tables
      await queryInterface.sequelize.query(
        `DO $$
        DECLARE
          obj record;
        BEGIN
          FOR obj IN
            SELECT table_name as "tableName"
            FROM information_schema.tables
            WHERE table_schema='public'
              AND table_type='BASE TABLE'
              AND table_name != 'SequelizeMeta'
              AND table_name != 'RequestErrors'
              AND table_name NOT LIKE 'ZAL%'
          LOOP
            RAISE INFO 'Audit Tables: Update auditing on "%"', obj."tableName";

            -- Remove auditing from table
            PERFORM "ZAFRemoveAuditingOnTable"(obj."tableName"::text);

            -- Add new dml_as column
            EXECUTE format($sql$
              ALTER TABLE %I
              ADD COLUMN "dml_as" bigint $sql$,
              'ZAL' || obj."tableName"::text);

            -- Fix type of dml_by - was int, should be bigint
            EXECUTE format($sql$
              ALTER TABLE %I
              ALTER COLUMN "dml_by" TYPE bigint $sql$,
              'ZAL' || obj."tableName"::text);

            -- Restore auditing on table without recreating the table (hence false arg)
            PERFORM "ZAFAddAuditingOnTable"(obj."tableName"::text, false);

          END LOOP;
        END$$;`,
        { transaction }
      )
      // -------------

      // Enable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
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

      //
    })
  },
}
