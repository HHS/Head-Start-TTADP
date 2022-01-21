/*
Postgresql has a make table/trigger/function name length of 63 bytes.
In order to more likely stay under this limit all names are abbreviated where possible.
Statically defined names are known to be short enough, but are still abbreviated to keep
  consistency.
All dynamically generated table/trigger/function are abbreviated where possible.

The following list are the abbreviations used:
Z - Prefix to keep all audit tables, triggers, & function at the end of any list
A - Audit
L - Log
F - Function
T - Trigger

Examples:
  ZAL - Z Audit Log
  ZALF - Z Audit Log Function
  ZALT - Z Audit Log Trigger

All table/type/function/trigger create/alter/drops are monitored and logged to a ddl audit log.
All calls to truncate a table are logged into the ddl audit log for the corresponding table.
All methods to create a table will trigger the creation of a corresponding set of audit
  table/function/triggers necessary to audit all activity on the triggering table.
When a table is dropped the functions and triggers monitoring that table are removed, the audit
   log it self is not removed to maintain audit integrity.
Truncate and Update to the audit log tables is not permitted through the used of triggers.
Delete on audit tables is only allowed when the 'ARCHIVE AUDIT LOG' descriptor is passed within
  the transaction. This is to allow stale records to be removed only under archival process.
  All other attempts to delete from an audit log table are prevented.
All insert/update/deletes performed on a monitored table will be logged.
Updates will only store the fields that change as part of the specific call.
Inserts and Deletes will keep the whole record.
Specific fields across all tables or for a specific table can be flagged as not being of
  significance requiring a audit log entry if they are the only field to change. If any other
  field also changes, all field that have changes will be recorded.
A passed in user id will be recorded with any log generated, If no user id was passed, -1 is used.
A passed in transaction id will be recorded with any log generated, if no transaction id was passed,
  then the built in postgresql transaction id will be used. The same transaction id should be used
  for all db calls generated form a single UI generated event to aid in associating all
  corresponding changes.
An optional descriptor can be passed and will be recorded with any log generated if supplied.
*/

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      let syncronizer;
      // Define a type to use for identifying INSERT, UPDATE, and DELETE
      syncronizer = await queryInterface.sequelize.query(
        `DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dml_type') THEN
                CREATE TYPE dml_type AS ENUM ('INSERT', 'UPDATE', 'DELETE');
            END IF;
        END$$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      // Define a table and function to store, access, and add descriptors to aid in identifying
      //  the cause of date modification or data definition changes. Add a descriptor to use for
      //  archival of audit logs.
      syncronizer = await queryInterface.createTable('ZADescriptor', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        descriptor: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
      }, { transaction })
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFDescriptorToID"(_param_id text)
        RETURNS INTEGER
        LANGUAGE plpgsql AS
        $func$
        DECLARE
            Did INTEGER;
        BEGIN
            IF _param_id IS NOT NULL THEN
                Did := id FROM "ZADescriptor" WHERE descriptor = _param_id;
                IF Did IS NULL THEN
                    INSERT INTO "ZADescriptor" (descriptor) VALUES (_param_id);
                    Did := id FROM "ZADescriptor" WHERE descriptor = _param_id;
                END IF;
            END IF;
            RAISE NOTICE 'DescriptorToID: % -> %', _param_id, Did;
            RETURN Did;
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          PERFORM "ZAFDescriptorToID"('ARCHIVE AUDIT LOG');
        END;
        $$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      // Define a table to allow for filtering on which fields with a change in value will be used
      //  to identify that enough has changed to warrant an audit log entry. Add an entry in the
      //  filter to not log a change if the only field that has changed is the 'updatedAt' column
      //  on any table.
      syncronizer = await queryInterface.createTable('ZAFilter', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        tableName: {
          allowNull: true,
          default: null,
          type: Sequelize.STRING,
        },
        columnName: {
          allowNull: false,
          type: Sequelize.STRING,
        },
      }, { transaction })
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `INSERT INTO "ZAFilter" ("tableName", "columnName")
        VALUES ( NULL, 'updatedAt');`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      // Define three functions to dynamically create function/trigger to prevent modification or
      //  removal of log data. Archival of log data is supported only when a descriptor is passed
      //  as part of the transaction session of type "ARCHIVE AUDIT LOG".
      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALNoUpdate"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          EXECUTE format($sql$
              CREATE FUNCTION %I()
                RETURNS trigger
                LANGUAGE plpgsql AS
              $body$
              BEGIN
                RAISE EXCEPTION 'Update of %s is not supported to maintain audit log integrity.';
              END;
              $body$;$sql$,
              'ZALNoUpdateF' || t_name,
              'ZAL' || t_name);

          EXECUTE format($sql$
              CREATE TRIGGER %I
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION %I()$sql$,
              'ZALNoUpdateT' || t_name,
              'ZAL' || t_name,
              'ZALNoUpdateF' || t_name);
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALNoDelete"(t_name varchar(63))
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
                DESCRIPTOR_ID int;
              BEGIN
                CREATED_BY := COALESCE(current_setting('var.loggedUser', true)::BIGINT, -1);

                TRANSACTION_ID := COALESCE(
                    current_setting('var.transactionId', true)::uuid,
                    lpad(txid_current()::text,32, '0')::uuid);

                DESCRIPTOR_ID := "ZAFDescriptorToID"(
                    NULLIF(current_setting('var.auditDescriptor', true)::TEXT, ''));

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
                    descriptor_id)
                VALUES (
                    'ARCHIVE DATA'
                    'AUDIT LOG TABLE',
                    'ttasmarthub',
                    %L,
                    CURRENT_TIMESTAMP,
                    CREATED_BY,
                    TRANSACTION_ID,
                    DESCRIPTOR_ID);
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
                CREATE TRIGGER %I
                  BEFORE UPDATE ON %I
                  FOR EACH ROW EXECUTE FUNCTION %I()$sql$,
                'ZALNoDeleteT' || t_name,
                'ZAL' || t_name,
                'ZALNoDeleteF' || t_name);
          END
          $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALNoTruncate"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          EXECUTE format($sql$
              CREATE FUNCTION %I()
                RETURNS trigger
                LANGUAGE plpgsql AS
              $body$
              BEGIN
                  RAISE EXCEPTION 'Truncate on %s is not supported to maintain audit log integrity.';
              END;
              $body$;$sql$,
              'ZALNoTruncateF' || t_name,
              'ZAL' || t_name);

          EXECUTE format($sql$
              CREATE TRIGGER %I
                BEFORE TRUNCATE ON %I
                FOR EACH STATEMENT EXECUTE FUNCTION %I()$sql$,
              'ZALNoTruncateT' || t_name,
              'ZAL' || t_name,
              'ZALNoTruncateF' || t_name);
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      // Define a table/function/triggers to log all data definition language commands, this covers
      //  all create/alter/drop commands for functions/tables/triggers/types.
      syncronizer = await queryInterface.createTable('ZALDDL', {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.BIGINT,
          autoIncrement: true,
        },
        command_tag: {
          allowNull: true,
          default: null,
          type: Sequelize.STRING,
        },
        object_type: {
          allowNull: true,
          default: null,
          type: Sequelize.STRING,
        },
        schema_name: {
          allowNull: true,
          default: null,
          type: Sequelize.STRING,
        },
        object_identity: {
          allowNull: true,
          default: null,
          type: Sequelize.STRING,
        },
        ddl_timestamp: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        ddl_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          comment: null,
        },
        ddl_txid: {
          type: Sequelize.UUID,
          allowNull: false,
          validate: { isUUID: 'all' },
        },
        descriptor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
        },
      }, {
        transaction,
        createdAt: false,
        updatedAt: false,
      })
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFAuditDDLCommand"()
          RETURNS event_trigger
          LANGUAGE plpgsql AS
        $func$
        DECLARE
            CREATED_BY BIGINT;
            TRANSACTION_ID UUID;
            DESCRIPTOR_ID INT;
            --is_superuser bool = false;
            r RECORD;
        BEGIN
            --select u.rolsuper into is_superuser from pg_catalog.pg_roles u where u.rolname = SESSION_USER;
            --if is_superuser then
            --    return;
            --end if;

            CREATED_BY := COALESCE(current_setting('var.loggedUser', true)::BIGINT, -1);

            TRANSACTION_ID := COALESCE(
                current_setting('var.transactionId', true)::uuid,
                lpad(txid_current()::text,32,'0')::uuid);

            DESCRIPTOR_ID := "ZAFDescriptorToID"(
                NULLIF(current_setting('var.auditDescriptor', true)::TEXT, ''));

            FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
              INSERT INTO "ZALDDL" (
                command_tag,
                object_type,
                schema_name,
                object_identity,
                ddl_timestamp,
                ddl_by,
                ddl_txid,
                descriptor_id)
            VALUES (
                r.command_tag,
                r.object_type,
                r.schema_name,
                r.object_identity,
                CURRENT_TIMESTAMP,
                CREATED_BY,
                TRANSACTION_ID,
                DESCRIPTOR_ID);
            END LOOP;
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE EVENT TRIGGER "ZATAuditAlterCommands"
        ON ddl_command_end
        WHEN TAG IN ('ALTER FUNCTION', 'ALTER TABLE', 'ALTER TRIGGER', 'ALTER TYPE')
        EXECUTE FUNCTION "ZAFAuditDDLCommand"();`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE EVENT TRIGGER "ZATAuditCreateCommands"
        ON ddl_command_end
        WHEN TAG IN ('CREATE FUNCTION', 'CREATE TABLE', 'CREATE TABLE AS', 'CREATE TRIGGER', 'CREATE TYPE', 'SELECT INTO')
        EXECUTE FUNCTION "ZAFAuditDDLCommand"();`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE EVENT TRIGGER "ZATAuditDropCommands"
        ON ddl_command_end
        WHEN TAG IN ('DROP FUNCTION', 'DROP TABLE', 'DROP TRIGGER', 'DROP TYPE')
        EXECUTE FUNCTION "ZAFAuditDDLCommand"();`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `SELECT
          "ZAFCreateALNoUpdate"('DDL'),
          "ZAFCreateALNoDelete"('DDL'),
          "ZAFCreateALNoTruncate"('DDL');`,
        { transaction },
      ).catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });

      // Define functions to generate the audit table/functions/triggers for a specified table.
      //  Once table/functions/triggers are in place, all insert/update/delete of data from the
      //  monitored table are recorded.
      syncronizer = await queryInterface.sequelize.query(
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
                  dml_by int NOT NULL,
                  dml_txid uuid NOT NULL,
                  descriptor_id INT,
                  PRIMARY KEY (id)
                  );$sql$,
                  'ZAL' || t_name);
          END
          $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
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
                    TRANSACTION_ID uuid;
                    DESCRIPTOR_ID int;
                    UNIQUE_OLD jsonb;
                    UNIQUE_NEW jsonb;
                    IS_LOGGABLE boolean;
                BEGIN
                    CREATED_BY := COALESCE(NULLIF(current_setting('audit.loggedUser', true),'')::BIGINT, -1);

                    TRANSACTION_ID := COALESCE(
                        NULLIF(current_setting('audit.transactionId', true),'')::uuid,
                        lpad(txid_current()::text,32,'0')::uuid);

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
                            dml_txid,
                            descriptor_id
                        )
                        VALUES(
                            NEW.id,
                            null,
                            to_jsonb(NEW),
                            'INSERT',
                            CURRENT_TIMESTAMP,
                            CREATED_BY,
                            TRANSACTION_ID,
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
                            dml_txid,
                            descriptor_id
                        )
                        VALUES(
                            NEW.id,
                            UNIQUE_OLD,
                            UNIQUE_NEW,
                            'UPDATE',
                            CURRENT_TIMESTAMP,
                            CREATED_BY,
                            TRANSACTION_ID,
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
                        dml_txid,
                        descriptor_id
                    )
                    VALUES(
                        OLD.id,
                        to_jsonb(OLD),
                        null,
                        'DELETE',
                        CURRENT_TIMESTAMP,
                        CREATED_BY,
                        TRANSACTION_ID,
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
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALTrigger"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          EXECUTE format($sql$
              CREATE TRIGGER %I
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH ROW EXECUTE FUNCTION %I()$sql$,
              'ZALT' || t_name,
              t_name,
              'ZALF' || t_name);
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateAuditTruncateTable"(t_name varchar(63))
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
                DESCRIPTOR_ID int;
              BEGIN
                CREATED_BY := COALESCE(current_setting('var.loggedUser', true)::BIGINT, -1);

                TRANSACTION_ID := COALESCE(
                    current_setting('var.transactionId', true)::uuid,
                    lpad(txid_current()::text,32,'0')::uuid);

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
                  descriptor_id)
              VALUES (
                  'TRUNCATE'
                  'TABLE',
                  'ttasmarthub',
                  %L,
                  CURRENT_TIMESTAMP,
                  CREATED_BY,
                  TRANSACTION_ID,
                  DESCRIPTOR_ID);
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
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      // Define functions for adding/removing audit monitoring to a table. Removing auditing does
      //  not remove the data already logged.

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFAddAuditingOnTable"(t_name varchar(63))
          RETURNS VOID
          LANGUAGE plpgsql AS
        $func$
        BEGIN
          RAISE NOTICE 'Adding Auditing on %', t_name;
          PERFORM "ZAFCreateALTable"(t_name);
          PERFORM "ZAFCreateALFunction"(t_name);
          PERFORM "ZAFCreateALTrigger"(t_name);
          PERFORM "ZAFCreateAuditTruncateTable"(t_name);
          PERFORM "ZAFCreateALNoUpdate"(t_name);
          PERFORM "ZAFCreateALNoDelete"(t_name);
          PERFORM "ZAFCreateALNoTruncate"(t_name);
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFAuditCreateTable"()
          RETURNS event_trigger
          LANGUAGE plpgsql AS
        $func$
        DECLARE
            obj record;
        BEGIN
            FOR obj IN
            SELECT *
            FROM pg_event_trigger_ddl_commands()
            LOOP
              IF obj.command_tag = 'CREATE TABLE'
                AND obj.object_type = 'table'
                AND obj.schema_name = 'public'
                AND obj.object_identity NOT LIKE 'ZAL%' THEN
                    PERFORM "ZAFAddAuditingOnTable"(obj.object_identity);
                END IF;
            END LOOP;
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      // syncronizer = await queryInterface.sequelize.query(
      //   `CREATE EVENT TRIGGER "ZATAuditCreateTable"
      //     ON ddl_command_end
      //     WHEN TAG IN ('SELECT INTO', 'CREATE TABLE', 'CREATE TABLE AS')
      //     EXECUTE FUNCTION "ZAFAuditCreateTable"();`,
      //   { transaction },
      // )
      //   .catch((error) => {
      //     console.error(error); // eslint-disable-line no-console
      //   });

      syncronizer = await queryInterface.sequelize.query(
        `SELECT table_name, "ZAFAddAuditingOnTable"(table_name::varchar)
        FROM information_schema.tables
        WHERE table_schema='public'
          AND table_type='BASE TABLE'
          AND table_catalog='ttasmarthub'
          AND table_name != 'SequelizeMeta'
          AND table_name != 'RequestErrors'
          AND table_name NOT LIKE 'ZAL%';`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
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
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFAuditDropTable"()
          RETURNS event_trigger
          LANGUAGE plpgsql AS
        $func$
        DECLARE
            obj record;
        BEGIN
            FOR obj IN
            SELECT *
            FROM pg_event_trigger_dropped_objects()
            LOOP
                IF obj.object_name NOT LIKE 'ZAL%' THEN
                    PERFORM "ZAFRemoveAuditingOnTable"(obj.object_name);
                END IF;
            END LOOP;
        END
        $func$;`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      syncronizer = await queryInterface.sequelize.query(
        `CREATE EVENT TRIGGER "ZATAuditDropTable"
        ON sql_drop
        WHEN TAG IN ('DROP TABLE')
        EXECUTE FUNCTION "ZAFAuditDropTable"();`,
        { transaction },
      )
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });

      if (syncronizer != null) {
        syncronizer = null;
      }
    },
  )
    .catch((error) => {
      console.error(error); // eslint-disable-line no-console
    }),
  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.sequelize.query(
        `SELECT json_agg(table_name) as "tables"
        FROM information_schema.tables
        WHERE table_schema='public'
          AND table_type='BASE TABLE'
          AND table_catalog='ttasmarthub'
          AND table_name != 'SequelizeMeta'
          AND table_name NOT LIKE 'ZAL%';`,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        },
      )
        .then(async (result) => {
          const [{ tables }] = result;
          console.log(`Find all tables: ${JSON.stringify(tables)}`); // eslint-disable-line no-console
          tables.forEach(async (table) => {
            await queryInterface.sequelize.query(
              `SELECT
                  "ZAFRemoveAuditingOnTable"('${table}');`,
              { transaction },
            )
              .catch((error) => {
                console.error(error); // eslint-disable-line no-console
              });
          });
        })
        .catch((error) => {
          console.error(error); // eslint-disable-line no-console
        });
    },
  ),
};
