const { prepMigration } = require('../lib/migration')

const OLD_VALUE = 'State health and welness systems'
const NEW_VALUE = 'State health and wellness systems'
const ENUM_NAME = 'enum_CollabReports_participants'

const COLLAB_REPORT_PARTICIPANTS = [
  'Child Care and Development Fund',
  'Child care licensing',
  'Child Care Training and Technical Assistance Network',
  'DOE/State PreK',
  'Head Start Collaboration Office',
  'Head Start Recipients',
  'Health department/WIC',
  'Office of Child Care',
  'Quality Rating and Improvement System',
  'State and territory adminstrators',
  'Regional HSA',
  'Regional Office staff',
  'State HSA',
  'State environmental health and safety systems',
  'State family engagement systems',
  'State health and wellness systems',
  'State homelessness agency/McKinney Vento liason',
  'State Professional development system',
  'TTA staff',
  'Other',
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Recreate the enum and transform the data in one operation
      // Pattern from 20230629000000-fix-some-column-issues.js
      const enumValues = COLLAB_REPORT_PARTICIPANTS.map((v) => `'${v}'`).join(',\n          ')

      await queryInterface.sequelize.query(
        `
        -- Step 1: Rename the old enum type
        ALTER TYPE "${ENUM_NAME}" RENAME TO "${ENUM_NAME}_OLD";

        -- Step 2: Create new enum with correct values
        CREATE TYPE "${ENUM_NAME}" AS ENUM (
          ${enumValues}
        );

        -- Step 3: Rename the old column
        ALTER TABLE "CollabReports" RENAME COLUMN "participants" TO "participants_old";

        -- Step 4: Add new column with new enum type
        ALTER TABLE "CollabReports" ADD COLUMN "participants" "${ENUM_NAME}"[];

        -- Step 5: Copy data from old column to new, transforming the typo
        UPDATE "CollabReports"
        SET "participants" = ARRAY(
          SELECT
            CASE
              WHEN elem::TEXT = '${OLD_VALUE}' THEN '${NEW_VALUE}'
              ELSE elem::TEXT
            END::"${ENUM_NAME}"
          FROM UNNEST("participants_old") AS elem
        )
        WHERE "participants_old" IS NOT NULL;

        -- Step 6: Drop the old column
        ALTER TABLE "CollabReports" DROP COLUMN "participants_old";

        -- Step 7: Drop the old enum type
        DROP TYPE IF EXISTS "${ENUM_NAME}_OLD";
      `,
        { transaction }
      )
    })
  },

  down: async () => {
    // Intentionally empty - we don't want to revert to the typo
  },
}
