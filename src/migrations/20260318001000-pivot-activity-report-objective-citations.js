const { prepMigration } = require('../lib/migration');

const AROC_TABLE = 'ActivityReportObjectiveCitations';
const CITATIONS_TABLE = 'Citations';

// Names for the foreign key and indexes added by this migration.
const CITATION_FK_NAME = 'aroc_citation_id_fk';
const DEDUPE_INDEX_NAME = 'aroc_activity_finding_grant_review_uniq';
const CITATION_INDEX_NAME = 'aroc_citation_id_idx';
const ARO_CITATION_INDEX_NAME = 'aroc_activity_objective_citation_id_idx';

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
    definition: { type: Sequelize.TEXT, allowNull },
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
]);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Run the entire pivot in a transaction and initialize migration session settings.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Explode monitoringReferences into a temp pivot table, normalize values,
      // and preserve entry order.
      await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS temp_aroc_pivot;
      CREATE TEMP TABLE temp_aroc_pivot AS
      WITH exploded AS (
        SELECT
          aroc.id AS source_id,
          aroc."activityReportObjectiveId" AS "activityReportObjectiveId",
          COALESCE(
            NULLIF(TRIM(refs.reference->>'citation'), ''),
            aroc.citation
          ) AS citation,
          aroc."createdAt" AS "createdAt",
          aroc."updatedAt" AS "updatedAt",
          refs.ordinality,
          NULLIF(TRIM(refs.reference->>'findingId'), '') AS "findingId",
          CASE
            WHEN NULLIF(TRIM(refs.reference->>'grantId'), '') ~ '^[0-9]+$'
              THEN (refs.reference->>'grantId')::INTEGER
            ELSE NULL
          END AS "grantId",
          NULLIF(TRIM(refs.reference->>'grantNumber'), '') AS "grantNumber",
          NULLIF(TRIM(refs.reference->>'reviewName'), '') AS "reviewName",
          CASE
            WHEN NULLIF(TRIM(refs.reference->>'standardId'), '') ~ '^[0-9]+$'
              THEN (refs.reference->>'standardId')::INTEGER
            ELSE NULL
          END AS "standardId",
          NULLIF(TRIM(refs.reference->>'findingType'), '') AS "findingType",
          NULLIF(TRIM(refs.reference->>'findingSource'), '') AS "findingSource",
          NULLIF(TRIM(refs.reference->>'acro'), '') AS acro,
          CASE
            WHEN NULLIF(TRIM(refs.reference->>'severity'), '') ~ '^[0-9]+$'
              THEN (refs.reference->>'severity')::INTEGER
            ELSE NULL
          END AS severity,
          CASE
            WHEN NULLIF(TRIM(refs.reference->>'reportDeliveryDate'), '') IS NOT NULL
              THEN refs.reference->>'reportDeliveryDate'
            ELSE NULL
          END AS "reportDeliveryDate",
          NULLIF(TRIM(refs.reference->>'monitoringFindingStatusName'), '')
            AS "monitoringFindingStatusName"
        FROM "${AROC_TABLE}" aroc
        LEFT JOIN LATERAL (
          SELECT reference, ordinality
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(aroc."monitoringReferences") = 'array'
                THEN aroc."monitoringReferences"
              ELSE '[]'::jsonb
            END
          ) WITH ORDINALITY AS ref_rows(reference, ordinality)
        ) refs ON TRUE
      )
      SELECT
        source_id,
        "activityReportObjectiveId",
        citation,
        "createdAt",
        "updatedAt",
        "findingId",
        "grantId",
        "grantNumber",
        "reviewName",
        "standardId",
        "findingType",
        "findingSource",
        acro,
        severity,
        "reportDeliveryDate",
        "monitoringFindingStatusName",
        ROW_NUMBER() OVER (
          PARTITION BY source_id
          ORDER BY COALESCE(ordinality, 1), source_id
        ) AS row_number
      FROM exploded;
    `, { transaction });

      // Keep the legacy monitoringReferences column for historical data, but allow nulls.
      await queryInterface.changeColumn(
        AROC_TABLE,
        'monitoringReferences',
        { type: Sequelize.JSONB, allowNull: true },
        { transaction },
      );

      // Add flattened citation/monitoring columns to the destination AROC table.
      await Promise.all(flattenedColumnConfigs(Sequelize).map(({ name, definition }) => (
        queryInterface.addColumn(AROC_TABLE, name, definition, { transaction })
      )));

      // Update existing AROC rows with the first exploded monitoring reference for each source row.
      await queryInterface.sequelize.query(
        `
          UPDATE "${AROC_TABLE}" aroc
          SET
            citation = COALESCE(NULLIF(TRIM(pivot.citation), ''), aroc.citation),
            "findingId" = pivot."findingId",
            "grantId" = pivot."grantId",
            "grantNumber" = pivot."grantNumber",
            "reviewName" = pivot."reviewName",
            "standardId" = pivot."standardId",
            "findingType" = pivot."findingType",
            "findingSource" = pivot."findingSource",
            acro = pivot.acro,
            severity = pivot.severity,
            "reportDeliveryDate" = pivot."reportDeliveryDate",
            "monitoringFindingStatusName" = pivot."monitoringFindingStatusName",
            "updatedAt" = GREATEST(aroc."updatedAt", pivot."updatedAt")
          FROM temp_aroc_pivot pivot
          WHERE aroc.id = pivot.source_id
            AND pivot.row_number = 1;
        `,
        { transaction },
      );

      // Insert additional AROC rows for any remaining monitoring references beyond the first.
      await queryInterface.sequelize.query(
        `
          INSERT INTO "${AROC_TABLE}" (
            "activityReportObjectiveId",
            citation,
            "citationId",
            "findingId",
            "grantId",
            "grantNumber",
            "reviewName",
            "standardId",
            "findingType",
            "findingSource",
            acro,
            severity,
            "reportDeliveryDate",
            "monitoringFindingStatusName",
            "createdAt",
            "updatedAt"
          )
          SELECT
            pivot."activityReportObjectiveId",
            COALESCE(NULLIF(TRIM(pivot.citation), ''), ''),
            NULL,
            pivot."findingId",
            pivot."grantId",
            pivot."grantNumber",
            pivot."reviewName",
            pivot."standardId",
            pivot."findingType",
            pivot."findingSource",
            pivot.acro,
            pivot.severity,
            pivot."reportDeliveryDate",
            pivot."monitoringFindingStatusName",
            pivot."createdAt",
            pivot."updatedAt"
          FROM temp_aroc_pivot pivot
          WHERE pivot.row_number > 1
            AND pivot."activityReportObjectiveId" IS NOT NULL;
        `,
        { transaction },
      );

      // Match AROC finding identifiers against citation records by UUID first, then numeric MFID.
      const citationMatch = `(
        c.finding_uuid = aroc."findingId"
        OR (
          aroc."findingId" ~ '^[0-9]+$'
          AND c.mfid = aroc."findingId"::INTEGER
        )
      )`;

      // Backfill citationId values using the best citation match for each AROC row.
      await queryInterface.sequelize.query(
        `
          WITH matched_citations AS (
            SELECT DISTINCT ON (aroc.id)
              aroc.id AS aroc_id,
              c.id AS citation_id
            FROM "${AROC_TABLE}" aroc
            JOIN "${CITATIONS_TABLE}" c
              ON ${citationMatch}
            WHERE aroc."findingId" IS NOT NULL
              AND c."deletedAt" IS NULL
            ORDER BY
              aroc.id,
              CASE WHEN c.finding_uuid = aroc."findingId" THEN 0 ELSE 1 END,
              c.id
          )
          UPDATE "${AROC_TABLE}" aroc
          SET "citationId" = matched_citations.citation_id
          FROM matched_citations
          WHERE aroc.id = matched_citations.aroc_id
            AND (
              aroc."citationId" IS NULL
              OR aroc."citationId" <> matched_citations.citation_id
            );
        `,
        { transaction },
      );

      // Remove duplicate flattened rows while keeping the best candidate per dedupe key.
      await queryInterface.sequelize.query(
        `
          WITH ranked AS (
            SELECT
              id,
              ROW_NUMBER() OVER (
                PARTITION BY
                  "activityReportObjectiveId",
                  COALESCE("findingId", ''),
                  COALESCE("grantId", -1),
                  COALESCE("reviewName", '')
                ORDER BY
                  ("citationId" IS NOT NULL) DESC,
                  "updatedAt" DESC,
                  id DESC
              ) AS row_number
            FROM "${AROC_TABLE}"
            WHERE "findingId" IS NOT NULL
               OR "grantId" IS NOT NULL
               OR "reviewName" IS NOT NULL
          )
          DELETE FROM "${AROC_TABLE}" aroc
          USING ranked
          WHERE aroc.id = ranked.id
            AND ranked.row_number > 1;
        `,
        { transaction },
      );

      // // Remove rows that cannot satisfy required flattened-column constraints.
      // // These legacy rows are incomplete and cannot be represented by the updated model.
      // await queryInterface.sequelize.query(
      //   `
      //     DELETE FROM "${AROC_TABLE}"
      //     WHERE "citationId" IS NULL
      //        OR "findingId" IS NULL
      //        OR "grantId" IS NULL
      //        OR "grantNumber" IS NULL
      //        OR "reviewName" IS NULL
      //        OR "standardId" IS NULL
      //        OR "findingType" IS NULL
      //        OR "findingSource" IS NULL
      //        OR acro IS NULL
      //        OR severity IS NULL
      //        OR "reportDeliveryDate" IS NULL
      //        OR "monitoringFindingStatusName" IS NULL;
      //   `,
      //   { transaction },
      // );

      // Align DB nullability with model-level required flattened columns.
      await Promise.all(flattenedColumnConfigs(Sequelize, false).map(({ name, definition }) => (
        queryInterface.changeColumn(AROC_TABLE, name, definition, { transaction })
      )));

      // Enforce referential integrity from AROC.citationId to Citations.id.
      await queryInterface.addConstraint(AROC_TABLE, {
        fields: ['citationId'],
        type: 'foreign key',
        name: CITATION_FK_NAME,
        references: { table: CITATIONS_TABLE, field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction,
      });

      // Enforce one row per objective/finding/grant/review tuple when any dedupe field is present.
      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "${DEDUPE_INDEX_NAME}"
          ON "${AROC_TABLE}" (
            "activityReportObjectiveId",
            COALESCE("findingId", ''),
            COALESCE("grantId", -1),
            COALESCE("reviewName", '')
          )
          WHERE "findingId" IS NOT NULL
            OR "grantId" IS NOT NULL
            OR "reviewName" IS NOT NULL;
     `, { transaction });

      // Add an index to speed lookups by citationId.
      await queryInterface.addIndex(AROC_TABLE, ['citationId'], {
        name: CITATION_INDEX_NAME,
        transaction,
      });

      // Add a composite index for objective-to-citation query patterns.
      await queryInterface.addIndex(AROC_TABLE, ['activityReportObjectiveId', 'citationId'], {
        name: ARO_CITATION_INDEX_NAME,
        transaction,
      });

      // Drop the temporary pivot table used for the data transformation.
      await queryInterface.sequelize.query(
        `
          DROP TABLE IF EXISTS temp_aroc_pivot;
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    // Run rollback in a transaction and initialize migration session settings.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Remove indexes and constraints created during the up migration.
      await queryInterface.removeConstraint(AROC_TABLE, CITATION_FK_NAME, { transaction });
      await queryInterface.removeIndex(AROC_TABLE, DEDUPE_INDEX_NAME, { transaction });
      await queryInterface.removeIndex(AROC_TABLE, CITATION_INDEX_NAME, { transaction });
      await queryInterface.removeIndex(AROC_TABLE, ARO_CITATION_INDEX_NAME, { transaction });

      // Remove the flattened citation/monitoring columns added by this migration.
      await Promise.all(flattenedColumnConfigs(Sequelize).map(({ name }) => (
        queryInterface.removeColumn(AROC_TABLE, name, { transaction })
      )));
    });
  },
};
