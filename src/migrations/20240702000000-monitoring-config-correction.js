const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Correct column configuration
      await queryInterface.sequelize.query(/* sql */`
        WITH 
          reconfigure AS (
            SELECT
              i."name",
              jsonb_agg(
                CASE
                  WHEN elem->>'tableName' = 'MonitoringFindings' THEN
                    jsonb_set(
                      elem,
                      '{remapDef}',
                      (elem->'remapDef')::jsonb - 'ReportDate' || jsonb_build_object('ReportedDate', 'reportedDate')
                  )
                  ELSE
                    elem
                END
              ) "definitions"
            FROM "Imports" i
            CROSS JOIN jsonb_array_elements(i."definitions") as elem
            WHERE i."name" = 'ITAMS Monitoring Data'
            AND "definitions" @> '[{"tableName": "MonitoringFindings"}]'
            GROUP BY 1
          )
          UPDATE "Imports" i
          SET "definitions" = r."definitions"
          FROM "reconfigure" r
          WHERE i."name" = r."name";
      `, { transaction });
      // Remove erroneous duplicate records
      await queryInterface.sequelize.query(/* sql */`
        WITH
          erroneous_records AS (
            SELECT DISTINCT if2.id 
            FROM "ImportFiles" if1
            JOIN "ImportFiles" if2
            ON  if1.id < if2.id
            AND if1."ftpFileInfo" -> 'name' = if2."ftpFileInfo" -> 'name'
          )
        DELETE FROM "ImportFiles" i
        USING erroneous_records er
        WHERE i.id = er.id;
      `, { transaction });
      // Add a unique constraint to prevent future duplicate entires
      await queryInterface.sequelize.query(/* sql */`
        CREATE UNIQUE INDEX "ImportFiles_ftpFileInfo_name_unique" ON "ImportFiles" (("ftpFileInfo" -> 'name'));
      `, { transaction });
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
        WITH 
          reconfigure AS (
            SELECT
              i."name",
              jsonb_agg(
                CASE
                  WHEN elem->>'tableName' = 'MonitoringFindings' THEN
                    jsonb_set(
                      elem,
                      '{remapDef}',
                      (elem->'remapDef')::jsonb - 'ReportedDate' || jsonb_build_object('ReportDate', 'reportDate')
                  )
                  ELSE
                    elem
                END
              ) "definitions"
            FROM "Imports" i
            CROSS JOIN jsonb_array_elements(i."definitions") as elem
            WHERE i."name" = 'ITAMS Monitoring Data'
            AND "definitions" @> '[{"tableName": "MonitoringFindings"}]'
            GROUP BY 1
          )
          UPDATE "Imports" i
          SET "definitions" = r."definitions"
          FROM "reconfigure" r
          WHERE i."name" = r."name";
      `, { transaction });
    },
  ),
};
