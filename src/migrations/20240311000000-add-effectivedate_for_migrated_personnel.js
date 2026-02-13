const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */
        `
        -------------
        -- PROCESS --
        -------------
        -- 1: Make sure the migration is valid
        -- 2: Get unique role assignments, so:
        --   roles * programs * grants * emails
        -- 3: Get the instances where people were set active
        --   This is separate because they may be set active
        --   in a different transaction than when the rest
        --   of their data was set
        -- 4: Get the latest activation timestamp for the currently assigned personnel
        --   No one appears to have been assigned to the same role * program * grant
        --   more than once, so this is more of a "due diligence" item
        -- 5: Update any blank effectiveDates with the latest activation timestamp

        -- 1: Make sure the migration is valid
        -- (The logic is not guaranteed to work if the values that associate personnel
        -- with a role in a ProgramPersonnel record have been updated more than once.)
        CREATE TEMP TABLE invalid_test
        AS
        WITH program_personnel_association_updates AS (
        SELECT
          data_id,
          COUNT(DISTINCT new_row_data->>'email') email_cnt,
          COUNT(DISTINCT new_row_data->>'programId') program_cnt,
          COUNT(DISTINCT new_row_data->>'grantId') grant_cnt,
          COUNT(DISTINCT new_row_data->>'role') role_cnt
        FROM "ZALProgramPersonnel"
        GROUP BY 1
        )
        SELECT *
        FROM program_personnel_association_updates
        WHERE email_cnt > 1
          OR program_cnt > 1
          OR grant_cnt > 1
          OR role_cnt > 1
        ;
        -- This will cause a divide by zero error that fails the transaction if invalid_test is not empty
        SELECT
          1/(LEAST(COUNT(*),1) - 1)
        FROM invalid_test
        ;
        
        -- 2: Get unique role assignments
        WITH all_personnel_roles AS (
        SELECT DISTINCT
          (new_row_data->>'programId')::int pid,
          (new_row_data->>'grantId')::int grid,
          new_row_data->>'role' prole,
          new_row_data->>'email' email,
          data_id
        FROM "ZALProgramPersonnel"
        ),
        ordered_effective_dates AS (
        SELECT
          pp.id ppid,
          zpp.dml_timestamp effective_date,
          -- 4: Count how many times each email * role * program * grant was assigned
          ROW_NUMBER() OVER (
            PARTITION BY apr.data_id
            ORDER BY zpp.dml_timestamp DESC
          ) date_order
        FROM "ProgramPersonnel" pp
        JOIN all_personnel_roles apr
          ON pp.id = apr.data_id
          AND pp.email = apr.email
        -- 3: Get the instances where people were set active
        JOIN "ZALProgramPersonnel" zpp
          ON pp.id = zpp.data_id
          AND (zpp.new_row_data->>'active')::bool = TRUE
        WHERE pp.active = TRUE
        )
        UPDATE "ProgramPersonnel" pp
        -- 5: Update any blank effectiveDates
        SET "effectiveDate" = effective_date
        FROM ordered_effective_dates
        -- 4: Get the latest activation timestamp
        WHERE date_order = 1
          AND ppid = id
          AND pp."effectiveDate" IS NULL;
        `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
