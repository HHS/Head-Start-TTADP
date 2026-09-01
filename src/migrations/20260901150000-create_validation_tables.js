const { prepMigration, removeTables } = require('../lib/migration');

/**
 * Tables backing the daily validation of imported data (initially ITAMS Monitoring data).
 * - ValidationRuns: one row per validation run, per process (e.g. 'monitoring').
 * - ValidationTimeSeries: long/narrow time-series aggregated statistics, progressively upserted.
 * - ValidationRecords: per-entity observations (scalar or categorical) used by validations.
 * - ValidationAlerts: alerts raised by validations over the time series and observations.
 * None of these tables are audit-logged; they are derived/operational data,
 * so auditing is removed and the auto-created ZAL tables are dropped.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'ValidationRuns',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          process_name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          status: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          started_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          import_id: {
            // Soft reference to the import this run validated; null when not tied to
            // an import. See the non-unique index below.
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          source_updated_at: {
            // The source's own data date for that import (ImportFiles.ftpFileInfo.date,
            // the same value the import writes to the raw rows' sourceUpdatedAt).
            type: Sequelize.DATE,
            allowNull: true,
          },
          completed_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          stats_upserted: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          observation_count: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          alert_count: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          error: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        'ValidationTimeSeries',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          feature_set: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          period_type: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          period_start: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          // 0 = not applicable/unknown; NULL would break the ON CONFLICT upsert key
          region_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          geo_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          stat_name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          value: {
            type: Sequelize.DECIMAL,
            allowNull: false,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'ValidationTimeSeries',
        ['feature_set', 'period_type', 'period_start', 'region_id', 'geo_id', 'stat_name'],
        {
          unique: true,
          name: 'ValidationTimeSeries_feature_period_region_stat_unique',
          transaction,
        }
      );

      await queryInterface.createTable(
        'ValidationRecords',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          run_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: { tableName: 'ValidationRuns' },
              key: 'id',
            },
          },
          entity_type: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          entity_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          observation_name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          scalar: {
            type: Sequelize.DECIMAL,
            allowNull: true,
          },
          category: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('ValidationRecords', ['entity_type', 'observation_name'], {
        name: 'ValidationRecords_entity_type_observation_name',
        transaction,
      });

      // run_id (FK, not auto-indexed) leads the retention, count, and alert-generation filters.
      await queryInterface.addIndex('ValidationRecords', ['run_id', 'observation_name'], {
        name: 'ValidationRecords_run_id_observation_name',
        transaction,
      });

      await queryInterface.createTable(
        'ValidationAlerts',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          run_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: { tableName: 'ValidationRuns' },
              key: 'id',
            },
          },
          check_name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          // 'alert' (informational, Slack only) or 'critical' (outage-level).
          // The orchestrator counts critical alerts for a run to decide whether
          // to gate; see src/tools/validation/runValidation.ts.
          severity: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: 'alert',
          },
          context: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('ValidationAlerts', ['check_name'], {
        name: 'ValidationAlerts_check_name',
        transaction,
      });

      await queryInterface.addIndex('ValidationAlerts', ['run_id', 'severity'], {
        name: 'ValidationAlerts_run_id_severity',
        transaction,
      });

      await queryInterface.addIndex('ValidationRuns', ['process_name', 'started_at'], {
        name: 'ValidationRuns_process_name_started_at',
        transaction,
      });

      // Not unique - purely for performance - so any integer id can be stored.
      await queryInterface.addIndex('ValidationRuns', ['import_id'], {
        name: 'ValidationRuns_import_id',
        transaction,
      });

      // These tables are derived/operational data - don't audit-log them,
      // and drop the ZAL tables auto-created by the audit event trigger.
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFRemoveAuditingOnTable"('ValidationRuns');
        SELECT "ZAFRemoveAuditingOnTable"('ValidationTimeSeries');
        SELECT "ZAFRemoveAuditingOnTable"('ValidationRecords');
        SELECT "ZAFRemoveAuditingOnTable"('ValidationAlerts');
        DROP TABLE IF EXISTS "ZALValidationRuns";
        DROP TABLE IF EXISTS "ZALValidationTimeSeries";
        DROP TABLE IF EXISTS "ZALValidationRecords";
        DROP TABLE IF EXISTS "ZALValidationAlerts";
        `,
        { raw: true, transaction }
      );
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // FK dependents before ValidationRuns
      await removeTables(queryInterface, transaction, [
        'ValidationAlerts',
        'ValidationRecords',
        'ValidationTimeSeries',
        'ValidationRuns',
      ]);

      await queryInterface.sequelize.query(
        `
        DELETE FROM "ZAFilter"
        WHERE "tableName" IN ('ValidationRuns', 'ValidationTimeSeries', 'ValidationRecords', 'ValidationAlerts');
        `,
        { transaction }
      );
    });
  },
};
