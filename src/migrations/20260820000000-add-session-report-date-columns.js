const { prepMigration } = require('../lib/migration');

/**
 * Adds dedicated startDate/endDate DATE columns to SessionReportPilots and
 * backfills them from the JSONB `data` column. The legacy JSONB values were
 * stored inconsistently (YYYY-MM-DD, MM/DD/YYYY, MM/DD/YY, empty, or missing),
 * so the backfill normalizes each recognized format. Unrecognized/empty values
 * resolve to NULL.
 *
 * The JSONB `data.startDate` / `data.endDate` keys are intentionally left in
 * place; the service layer treats the columns as the source of truth and
 * re-derives the JSONB values from them on read.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn(
        'SessionReportPilots',
        'startDate',
        { type: Sequelize.DATEONLY, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'SessionReportPilots',
        'endDate',
        { type: Sequelize.DATEONLY, allowNull: true },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "SessionReportPilots" SET
          "startDate" = CASE
            WHEN (data->>'startDate') IS NULL OR TRIM(data->>'startDate') = '' THEN NULL
            WHEN (data->>'startDate') ~ '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
              AND CAST(SPLIT_PART(data->>'startDate', '-', 3) AS INTEGER) <= CASE
                WHEN CAST(SPLIT_PART(data->>'startDate', '-', 2) AS INTEGER) IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN CAST(SPLIT_PART(data->>'startDate', '-', 2) AS INTEGER) IN (4, 6, 9, 11) THEN 30
                WHEN CAST(SPLIT_PART(data->>'startDate', '-', 2) AS INTEGER) = 2 THEN CASE
                  WHEN (
                    CAST(SPLIT_PART(data->>'startDate', '-', 1) AS INTEGER) % 400 = 0
                    OR (
                      CAST(SPLIT_PART(data->>'startDate', '-', 1) AS INTEGER) % 4 = 0
                      AND CAST(SPLIT_PART(data->>'startDate', '-', 1) AS INTEGER) % 100 <> 0
                    )
                  ) THEN 29
                  ELSE 28
                END
                ELSE 0
              END
              THEN MAKE_DATE(
                CAST(SPLIT_PART(data->>'startDate', '-', 1) AS INTEGER),
                CAST(SPLIT_PART(data->>'startDate', '-', 2) AS INTEGER),
                CAST(SPLIT_PART(data->>'startDate', '-', 3) AS INTEGER)
              )
            WHEN (data->>'startDate') ~ '^(0?[1-9]|1[0-2])/(0?[1-9]|[12]\\d|3[01])/\\d{4}$'
              AND CAST(SPLIT_PART(data->>'startDate', '/', 2) AS INTEGER) <= CASE
                WHEN CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER) IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER) IN (4, 6, 9, 11) THEN 30
                WHEN CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER) = 2 THEN CASE
                  WHEN (
                    CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) % 400 = 0
                    OR (
                      CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) % 4 = 0
                      AND CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) % 100 <> 0
                    )
                  ) THEN 29
                  ELSE 28
                END
                ELSE 0
              END
              THEN MAKE_DATE(
                CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER),
                CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER),
                CAST(SPLIT_PART(data->>'startDate', '/', 2) AS INTEGER)
              )
            WHEN (data->>'startDate') ~ '^(0?[1-9]|1[0-2])/(0?[1-9]|[12]\\d|3[01])/\\d{2}$'
              AND CAST(SPLIT_PART(data->>'startDate', '/', 2) AS INTEGER) <= CASE
                WHEN CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER) IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER) IN (4, 6, 9, 11) THEN 30
                WHEN CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER) = 2 THEN CASE
                  WHEN (
                    (CASE
                      WHEN CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) <= 68
                        THEN 2000 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                      ELSE 1900 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                    END) % 400 = 0
                    OR (
                      (CASE
                        WHEN CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) <= 68
                          THEN 2000 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                        ELSE 1900 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                      END) % 4 = 0
                      AND (CASE
                        WHEN CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) <= 68
                          THEN 2000 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                        ELSE 1900 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                      END) % 100 <> 0
                    )
                  ) THEN 29
                  ELSE 28
                END
                ELSE 0
              END
              THEN MAKE_DATE(
                CASE
                  WHEN CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER) <= 68
                    THEN 2000 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                  ELSE 1900 + CAST(SPLIT_PART(data->>'startDate', '/', 3) AS INTEGER)
                END,
                CAST(SPLIT_PART(data->>'startDate', '/', 1) AS INTEGER),
                CAST(SPLIT_PART(data->>'startDate', '/', 2) AS INTEGER)
              )
            ELSE NULL
          END,
          "endDate" = CASE
            WHEN (data->>'endDate') IS NULL OR TRIM(data->>'endDate') = '' THEN NULL
            WHEN (data->>'endDate') ~ '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
              AND CAST(SPLIT_PART(data->>'endDate', '-', 3) AS INTEGER) <= CASE
                WHEN CAST(SPLIT_PART(data->>'endDate', '-', 2) AS INTEGER) IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN CAST(SPLIT_PART(data->>'endDate', '-', 2) AS INTEGER) IN (4, 6, 9, 11) THEN 30
                WHEN CAST(SPLIT_PART(data->>'endDate', '-', 2) AS INTEGER) = 2 THEN CASE
                  WHEN (
                    CAST(SPLIT_PART(data->>'endDate', '-', 1) AS INTEGER) % 400 = 0
                    OR (
                      CAST(SPLIT_PART(data->>'endDate', '-', 1) AS INTEGER) % 4 = 0
                      AND CAST(SPLIT_PART(data->>'endDate', '-', 1) AS INTEGER) % 100 <> 0
                    )
                  ) THEN 29
                  ELSE 28
                END
                ELSE 0
              END
              THEN MAKE_DATE(
                CAST(SPLIT_PART(data->>'endDate', '-', 1) AS INTEGER),
                CAST(SPLIT_PART(data->>'endDate', '-', 2) AS INTEGER),
                CAST(SPLIT_PART(data->>'endDate', '-', 3) AS INTEGER)
              )
            WHEN (data->>'endDate') ~ '^(0?[1-9]|1[0-2])/(0?[1-9]|[12]\\d|3[01])/\\d{4}$'
              AND CAST(SPLIT_PART(data->>'endDate', '/', 2) AS INTEGER) <= CASE
                WHEN CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER) IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER) IN (4, 6, 9, 11) THEN 30
                WHEN CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER) = 2 THEN CASE
                  WHEN (
                    CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) % 400 = 0
                    OR (
                      CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) % 4 = 0
                      AND CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) % 100 <> 0
                    )
                  ) THEN 29
                  ELSE 28
                END
                ELSE 0
              END
              THEN MAKE_DATE(
                CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER),
                CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER),
                CAST(SPLIT_PART(data->>'endDate', '/', 2) AS INTEGER)
              )
            WHEN (data->>'endDate') ~ '^(0?[1-9]|1[0-2])/(0?[1-9]|[12]\\d|3[01])/\\d{2}$'
              AND CAST(SPLIT_PART(data->>'endDate', '/', 2) AS INTEGER) <= CASE
                WHEN CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER) IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER) IN (4, 6, 9, 11) THEN 30
                WHEN CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER) = 2 THEN CASE
                  WHEN (
                    (CASE
                      WHEN CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) <= 68
                        THEN 2000 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                      ELSE 1900 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                    END) % 400 = 0
                    OR (
                      (CASE
                        WHEN CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) <= 68
                          THEN 2000 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                        ELSE 1900 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                      END) % 4 = 0
                      AND (CASE
                        WHEN CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) <= 68
                          THEN 2000 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                        ELSE 1900 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                      END) % 100 <> 0
                    )
                  ) THEN 29
                  ELSE 28
                END
                ELSE 0
              END
              THEN MAKE_DATE(
                CASE
                  WHEN CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER) <= 68
                    THEN 2000 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                  ELSE 1900 + CAST(SPLIT_PART(data->>'endDate', '/', 3) AS INTEGER)
                END,
                CAST(SPLIT_PART(data->>'endDate', '/', 1) AS INTEGER),
                CAST(SPLIT_PART(data->>'endDate', '/', 2) AS INTEGER)
              )
            ELSE NULL
          END;
        `,
        { transaction }
      );
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('SessionReportPilots', 'startDate', { transaction });
      await queryInterface.removeColumn('SessionReportPilots', 'endDate', { transaction });
    });
  },
};
