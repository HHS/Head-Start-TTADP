const { prepMigration } = require('../lib/migration');

const PROD_URI = 'https://ttahub.ohs.acf.hhs.gov';
const DUMMY_PREFIX = '[Dummy] ';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Dummy data is for dev/staging/local only; never populate production
    if (process.env.TTA_SMART_HUB_URI === PROD_URI) {
      return;
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // 720 submissions over the past ~6 months spread across existing users,
      // the pages that render the survey, and a ~70/30 yes/no split
      await queryInterface.sequelize.query(
        `
          WITH users AS (
            SELECT
              u.id,
              u."homeRegionId",
              COALESCE(
                ARRAY_AGG(COALESCE(r."fullName", r.name)) FILTER (WHERE r.id IS NOT NULL),
                ARRAY[]::VARCHAR[]
              ) AS roles,
              ROW_NUMBER() OVER (ORDER BY u.id) AS rn
            FROM "Users" u
            LEFT JOIN "UserRoles" ur ON ur."userId" = u.id
            LEFT JOIN "Roles" r ON r.id = ur."roleId"
            GROUP BY u.id
            ORDER BY u.id
            LIMIT 200
          ),
          user_count AS (
            SELECT COUNT(*) AS n FROM users
          ),
          samples AS (
            SELECT
              gs AS i,
              NOW() - RANDOM() * INTERVAL '180 days' AS "submittedAt",
              (ARRAY['qa-dashboard', 'activity-reports-landing', 'collaboration-reports-landing'])[1 + FLOOR(RANDOM() * 3)::INT] AS "pageId",
              CASE WHEN RANDOM() < 0.7 THEN 'yes' ELSE 'no' END AS response,
              1 + FLOOR(RANDOM() * (SELECT n FROM user_count))::INT AS user_rn,
              1 + FLOOR(RANDOM() * 5)::INT AS comment_idx
            FROM GENERATE_SERIES(0, 719) gs
          )
          INSERT INTO "FeedbackSurveys"
            ("regionId", "userRoles", "pageId", response, comment, "submittedAt", "createdAt", "updatedAt")
          SELECT
            u."homeRegionId",
            u.roles,
            s."pageId",
            s.response::"enum_FeedbackSurveys_response",
            :prefix || CASE
              WHEN s.response = 'yes' THEN (ARRAY[
                'Very helpful page.',
                'Easy to use and clear.',
                'Found what I needed quickly.',
                'Great experience.',
                'This worked well for my workflow.'
              ])[s.comment_idx]
              ELSE (ARRAY[
                'Navigation was confusing.',
                'Could load faster.',
                'Hard to find the right filter.',
                'Needs clearer labels.',
                'I expected different results.'
              ])[s.comment_idx]
            END,
            s."submittedAt",
            s."submittedAt",
            s."submittedAt"
          FROM samples s
          JOIN users u ON u.rn = s.user_rn;
        `,
        { replacements: { prefix: DUMMY_PREFIX }, transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `DELETE FROM "FeedbackSurveys" WHERE comment LIKE :pattern;`,
        { replacements: { pattern: `${DUMMY_PREFIX}%` }, transaction }
      );
    });
  },
};
