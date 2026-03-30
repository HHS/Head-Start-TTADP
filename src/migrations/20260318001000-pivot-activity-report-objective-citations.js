/* eslint-disable max-len */
const { prepMigration } = require('../lib/migration');

// Flattened columns that persist monitoring reference metadata directly on AROC rows.
const flattenedColumnConfigs = (Sequelize, allowNull = true) => ([
  {
    name: 'citationId',
    definition: { type: Sequelize.INTEGER, allowNull },
  },
  {
    name: 'findingId',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'grantId',
    definition: { type: Sequelize.INTEGER, allowNull },
  },
  {
    name: 'grantNumber',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'reviewName',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'standardId',
    definition: { type: Sequelize.INTEGER, allowNull },
  },
  {
    name: 'findingType',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'findingSource',
    definition: { type: Sequelize.TEXT, allowNull: true },
  },
  {
    name: 'acro',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'severity',
    definition: { type: Sequelize.INTEGER, allowNull },
  },
  {
    name: 'reportDeliveryDate',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'monitoringFindingStatusName',
    definition: { type: Sequelize.TEXT, allowNull },
  },
  {
    name: 'name',
    definition: { type: Sequelize.TEXT, allowNull },
  },
]);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Run the entire pivot in a transaction and initialize migration session settings.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.changeColumn(
        'ActivityReportObjectiveCitations',
        'monitoringReferences',
        { type: Sequelize.JSONB, allowNull: true },
        { transaction },
      );

      await queryInterface.addColumn(
        'ActivityReportObjectiveCitations',
        'legacy',
        { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
        { transaction },
      );

      // Add flattened citation/monitoring columns to the destination AROC table.
      await Promise.all(flattenedColumnConfigs(Sequelize).map(({ name, definition }) => (
        queryInterface.addColumn('ActivityReportObjectiveCitations', name, definition, { transaction })
      )));

      const result = await queryInterface.sequelize.query(`
        -- temporary tables only last for the duration of the session
        CREATE TEMPORARY TABLE exploded
        (     
            "acro" text,
            "name" text,
            "grantId" int,
            "grantNumber" text,
            citation text,
            severity int,
            "findingId" text,
            "reviewName" text,
            "standardId" int,
            "findingType" text,
            "findingSource" text,
            "reportDeliveryDate" timestamptz,
            "monitoringFindingStatusName" text,
            "activityReportObjectiveId" int,
            "citationId" int,
            "legacy" boolean
        );

        INSERT INTO exploded (
            "activityReportObjectiveId",
            "citationId",
            legacy,
            "grantNumber",
            acro,
            "name",
            "grantId",
            citation,
            severity,
            "findingId",
            "reviewName",
            "standardId",
            "findingType",
            "findingSource",
            "reportDeliveryDate",
            "monitoringFindingStatusName"
        )
        SELECT
            aroc."activityReportObjectiveId",    
            NULL AS "citationId",
            FALSE as legacy,
            refs.*
        FROM "ActivityReportObjectiveCitations" aroc,
        jsonb_to_recordset(aroc."monitoringReferences") AS refs(
            "grantNumber" text,
            acro text,
            name text,
            "grantId" int,
            citation text,
            severity int,
            "findingId" text,
            "reviewName" text,
            "standardId" int,
            "findingType" text,
            "findingSource" text,
            "reportDeliveryDate" timestamptz,
            "monitoringFindingStatusName" text
        );
        UPDATE "exploded" SET "citationId" = c.id FROM "Citations" c WHERE exploded."findingId" = c.finding_uuid;

        SELECT * FROM exploded;
      `, { transaction, type: Sequelize.QueryTypes.SELECT });

      const totalNewRows = Number(result.length);

      const q = await queryInterface.sequelize.query('SELECT COUNT(*) FROM "ActivityReportObjectiveCitations" where "legacy" = true', { transaction, type: Sequelize.QueryTypes.SELECT });
      const totalLegacyRows = Number(q[0].count);

      const multipleRows = await queryInterface.sequelize.query(`
        SELECT COUNT(*)
            FROM "ActivityReportObjectiveCitations"
        WHERE jsonb_array_length("monitoringReferences") > 1;
      `, { transaction, type: Sequelize.QueryTypes.SELECT });

      const testAssumption = await queryInterface.sequelize.query(`
        SELECT COUNT(*)
            FROM "ActivityReportObjectiveCitations"
        WHERE jsonb_array_length("monitoringReferences") > 2;
      `, { transaction, type: Sequelize.QueryTypes.SELECT });

      if (testAssumption[0].count > 0) {
        throw new Error(`Found ${testAssumption[0].count} rows with more than 2 monitoring references. This migration only accounts for 1 monitoring reference per AROC. Aborting migration.`);
      }

      const totalMultipleRows = Number(multipleRows[0].count);
      const expectedNewRows = totalLegacyRows + totalMultipleRows;
      if (totalNewRows !== expectedNewRows) {
        throw new Error(`Expected: ${expectedNewRows} new rows, but got ${totalNewRows}. Aborting migration.`);
      }

      if (result.some((r) => !(r.grantNumber))) {
        throw new Error('Found at least one aroc with a missing grant number!');
      }

      // Enforce referential integrity from AROC.citationId to Citations.id.
      await queryInterface.addConstraint('ActivityReportObjectiveCitations', {
        fields: ['citationId'],
        type: 'foreign key',
        name: 'aroc_citation_id_fk',
        references: { table: 'Citations', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction,
      });

      // weird to have an if statement here, but it'll be required when spinning up the test database
      // since there won't be any records to insert into the new table and empty array bulkInserts cause synax errors
      if (result.length > 0) {
        await queryInterface.bulkInsert(
          'ActivityReportObjectiveCitations',
          result,
          { transaction },
        );
      }

      await queryInterface.bulkDelete('ActivityReportObjectiveCitations', { legacy: true }, { transaction });

      await queryInterface.removeColumn('ActivityReportObjectiveCitations', 'legacy', { transaction });
      await queryInterface.removeColumn('ActivityReportObjectiveCitations', 'monitoringReferences', { transaction });

      // Align DB nullability with model-level required flattened columns.
      await Promise.all(flattenedColumnConfigs(Sequelize, false).map(({ name, definition }) => (
        queryInterface.changeColumn('ActivityReportObjectiveCitations', name, definition, { transaction })
      )));
    });
  },

  async down() {
    // no rollback — restore via audit log if needed
  },
};
