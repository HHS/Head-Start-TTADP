const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */
        `
        -------------
        -- PROCESS --
        -------------
        -- 0: Make sure the migration is valid
        -- 1: Get all the roles * programs * grants
        -- 2: Get the history of all roles, so:
        --   roles * programs * grants * emails
        -- 3: Get the instances where people were set active
        --   This is separate because they may be set active
        --   in a different transaction than when the rest
        --   of their data was set
        -- 4: Count how many times each role * program * grant was assigned
        -- 5: Get the latest activation timestamp for the currently assigned personnel
        --   No one appears to have been assigned to the same role * program * grant
        --   more than once, so this is more of a "due diligence" item
        -- 6: Update any blank effectiveDates with the latest activation timestamp

        -- 0: Make sure the migration is valid
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
        
        -- 1: Get all the roles * programs * grants
        WITH all_assigned_roles AS (
        SELECT DISTINCT
          "programId" pid,
          "grantId" grid,
          role
        FROM "ProgramPersonnel"
        ),
        -- 2: Get the history of all roles
        all_personnel_roles AS (
        SELECT DISTINCT
          (new_row_data->>'programId')::int zpid,
          (new_row_data->>'grantId')::int zgrid,
          new_row_data->>'role' zrole,
          new_row_data->>'email' zemail,
          data_id
        FROM "ZALProgramPersonnel"
        ),
        total_assignments_per_role AS (
        SELECT
          COUNT(*) pers_ass_over_time_cnt,
          pid,
          grid,
          role
        FROM all_assigned_roles aar
        JOIN all_personnel_roles apr
          ON pid = zpid
          AND grid = zgrid
          AND role = zrole
        GROUP BY 2,3,4
        ),
        ordered_effective_dates AS (
        SELECT
          data_id ppid,
          email,
          zpp.dml_timestamp effective_date,
          -- 4: Count how many times each role * program * grant was assigned
          ROW_NUMBER() OVER (
            PARTITION BY data_id, email
            ORDER BY zpp.dml_timestamp DESC
          ) date_order
        FROM "ProgramPersonnel" pp
        JOIN total_assignments_per_role tapr
          ON pp."programId" = tapr.pid
          AND pp."grantId" = tapr.grid
          AND pp.role = tapr.role
          AND pers_ass_over_time_cnt > 1
        -- 3: Get the instances where people were set active
        JOIN "ZALProgramPersonnel" zpp
          ON pp.id = zpp.data_id
          AND (zpp.new_row_data->>'active')::bool = TRUE
        WHERE pp.active = TRUE
        )
        UPDATE "ProgramPersonnel" pp
        -- 6: Update any blank effectiveDates
        SET "effectiveDate" = effective_date
        FROM ordered_effective_dates
        -- 5: Get the latest activation timestamp
        WHERE date_order = 1
          AND ppid = id
          AND pp."effectiveDate" IS NULL;
        `,
        { transaction },
      );
    });
  },

  down: async () => {},
};
