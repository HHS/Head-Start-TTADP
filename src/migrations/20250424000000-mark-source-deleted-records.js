const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- This will show there are no records marked deleted
        DROP TABLE IF EXISTS beforecounts;
        CREATE TEMP TABLE beforecounts
        AS
        SELECT COUNT(*) beforecount, '"MonitoringClassSummaries"' btablename FROM "MonitoringClassSummaries" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringFindingGrants"' tablename FROM "MonitoringFindingGrants" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringReviewGrantees"' tablename FROM "MonitoringReviewGrantees" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringFindingHistories"' tablename FROM "MonitoringFindingHistories" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringReviews"' tablename FROM "MonitoringReviews" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringFindingHistoryStatuses"' tablename FROM "MonitoringFindingHistoryStatuses" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringReviewStatuses"' tablename FROM "MonitoringReviewStatuses" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringFindings"' tablename FROM "MonitoringFindings" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringFindingStandards"' tablename FROM "MonitoringFindingStandards" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringStandards"' tablename FROM "MonitoringStandards" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) beforecount, '"MonitoringFindingStatuses"' tablename FROM "MonitoringFindingStatuses" WHERE "deletedAt" IS NOT NULL
        ;

        -- This will cause the transaction to fail if there are any Monitoring records already marked as deleted
        SELECT 1/(LEAST(SUM(beforecount),1) - 1 ) FROM beforecounts;

        -- The actual marking of the records as deleted
        -- The millisecond additions are so that multiple duplicates aren't deleted at quite the same time
        UPDATE "MonitoringClassSummaries" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingGrants" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringReviewGrantees" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingHistories" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringReviews" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingHistoryStatuses" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringReviewStatuses" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringFindings" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingStandards" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringStandards" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingStatuses" SET "deletedAt" = NOW() + TRUNC(RANDOM()*999 +1) * (interval '1 ms') WHERE "sourceDeletedAt" IS NOT NULL;

        -- Count the marked-deleted records
        DROP TABLE IF EXISTS aftercounts;
        CREATE TEMP TABLE aftercounts
        AS
        SELECT COUNT(*) aftercount, '"MonitoringClassSummaries"' atablename FROM "MonitoringClassSummaries" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringFindingGrants"' tablename FROM "MonitoringFindingGrants" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringReviewGrantees"' tablename FROM "MonitoringReviewGrantees" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringFindingHistories"' tablename FROM "MonitoringFindingHistories" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringReviews"' tablename FROM "MonitoringReviews" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringFindingHistoryStatuses"' tablename FROM "MonitoringFindingHistoryStatuses" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringReviewStatuses"' tablename FROM "MonitoringReviewStatuses" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringFindings"' tablename FROM "MonitoringFindings" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringFindingStandards"' tablename FROM "MonitoringFindingStandards" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringStandards"' tablename FROM "MonitoringStandards" WHERE "deletedAt" IS NOT NULL
        UNION
        SELECT COUNT(*) aftercount, '"MonitoringFindingStatuses"' tablename FROM "MonitoringFindingStatuses" WHERE "deletedAt" IS NOT NULL
        ;

        -- A little query to inspect what was done
        SELECT
          beforecount,
          btablename,
          aftercount
        FROM beforecounts
        JOIN aftercounts
          ON btablename = atablename
        ORDER BY 2
        ;
    `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "MonitoringClassSummaries" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingGrants" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringReviewGrantees" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingHistories" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringReviews" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingHistoryStatuses" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringReviewStatuses" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringFindings" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingStandards" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringStandards" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
        UPDATE "MonitoringFindingStatuses" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
    `,
        { transaction }
      )
    })
  },
}
