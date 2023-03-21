module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const ENTITY_TYPES = {
        REPORT: 'report',
        REPORTGOAL: 'report_goal',
        REPORTOBJECTIVE: 'report_objective',
        GOAL: 'goal',
        GOALTEMPLATE: 'goal_template',
        OBJECTIVE: 'objective',
        OBJECTIVETEMPLATE: 'objectiveTemplate',
      };

      const APPROVAL_RATIO = {
        ANY: 'any',
        MAJORITY: 'majority',
        TWOTHIRDS: 'two_thirds',
        ALL: 'all',
      };

      const REPORT_STATUSES = {
        DRAFT: 'draft',
        DELETED: 'deleted',
        SUBMITTED: 'submitted',
        APPROVED: 'approved',
        NEEDS_ACTION: 'needs_action',
      };

      try {
        const loggedUser = '0';
        // const transactionId = '';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.createTable('ActivityReportApprovals', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          activityReportId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'ActivityReports',
              },
              key: 'id',
            },
          },
          ratioRequired: {
            allowNull: false,
            type: Sequelize.DataTypes
              .ENUM(Object.values(APPROVAL_RATIO)),
            default: APPROVAL_RATIO.ALL,
          },
          submissionStatus: {
            allowNull: false,
            type: Sequelize.DataTypes
              .ENUM(Object.values(REPORT_STATUSES)),
          },
          calculatedStatus: {
            allowNull: true,
            type: Sequelize.DataTypes
              .ENUM(Object.values(REPORT_STATUSES)),
          },
          firstSubmittedAt: {
            allowNull: true,
            type: Sequelize.DataTypes.DATE,
          },
          submittedAt: {
            allowNull: true,
            type: Sequelize.DataTypes.DATE,
          },
          approvedAt: {
            allowNull: true,
            type: Sequelize.DataTypes.DATE,
          },
          createdAt: {
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        }, { transaction });

        await queryInterface.sequelize.query(
          `INSERT INTO "ActivityReportApprovals"
          (
            "activityReportId",
            "ratioRequired",
            "submissionStatus",
            "calculatedStatus",
            "firstSubmittedAt",
            "submittedAt",
            "approvedAt",
            "createdAt",
            "updatedAt",
            "deletedAt"
          )
          SELECT
            ar.id "activityReportId",
            '${APPROVAL_RATIO.ALL}'::"enum_ActivityReportApprovals_ratioRequired" "ratioRequired",
            CASE
              WHEN
                ar."submissionStatus" IS NULL
                AND ar."legacyId" IS NOT NULL
              THEN
                '${REPORT_STATUSES.SUBMITTED}'::"enum_ActivityReportApprovals_submissionStatus"
              ELSE
                ar."submissionStatus"::text::"enum_ActivityReportApprovals_submissionStatus"
            END "submissionStatus",
            CASE
              WHEN
                ar."calculatedStatus" IS NULL
                AND ar."legacyId" IS NOT NULL
              THEN
                '${REPORT_STATUSES.APPROVED}'::"enum_ActivityReportApprovals_calculatedStatus"
              ELSE
                ar."calculatedStatus"::text::"enum_ActivityReportApprovals_calculatedStatus"
            END "calculatedStatus",
            LEAST(ar."submittedDate", min((za."new_row_data" ->> 'updatedAt')::timestamp with time zone)
              filter (where (za."new_row_data" ->> 'submissionStatus')::text = 'submitted')) "firstSubmittedAt",
            GREATEST(ar."submittedDate", max((za."new_row_data" ->> 'updatedAt')::timestamp with time zone)
              filter (where (za."new_row_data" ->> 'submissionStatus')::text = 'submitted')) "submittedAt",
            GREATEST(ar."approvedAt", max((za."new_row_data" ->> 'updatedAt')::timestamp with time zone)
              filter (where (za."new_row_data" ->> 'calculatedStatus')::text = 'approved')) "approvedAt",
            ar."createdAt",
            ar."updatedAt",
            NULL::timestamp with time zone "deletedAt"
          FROM "ActivityReports" ar
          LEFT JOIN "ZALActivityReports" za
          ON ar.id = za.data_id
          AND (za."new_row_data" -> 'submissionStatus' is not null
          OR za."new_row_data" -> 'calculatedStatus' is not null)
          GROUP BY 1,2,3,4,8,9,10
          ORDER BY 1;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.sequelize.query(
          `SELECT
            "ZAFSetTriggerState"(null, null, null, 'DISABLE');`,
          { transaction },
        );
        await queryInterface.removeColumn('ActivityReports', 'submissionStatus', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'calculatedStatus', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'approvedAt', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'submittedDate', { transaction });
        await queryInterface.sequelize.query(
          `SELECT
            "ZAFSetTriggerState"(null, null, null, 'ENABLE');`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
