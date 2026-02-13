const { EMAIL_ACTIONS } = require('../constants')
const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.createTable(
        'GrantNumberLinks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
          },
          grantNumber: {
            primaryKey: true,
            allowNull: false,
            type: Sequelize.TEXT,
          },
          grantId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: {
                tableName: 'Grants',
              },
            },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          INSERT INTO "GrantNumberLinks"
          (
            "grantNumber",
            "grantId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            "number",
            "id",
            "createdAt",
            "updatedAt"
          FROM "Grants";
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringReviewLinks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
          },
          reviewId: {
            primaryKey: true,
            allowNull: false,
            type: Sequelize.TEXT,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.createTable(
        'MonitoringReviewStatusLinks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
          },
          statusId: {
            primaryKey: true,
            allowNull: false,
            type: Sequelize.INTEGER,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.createTable(
        'MonitoringReviewStatuses',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          statusId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringReviewStatusLinks',
              },
              key: 'statusId',
            },
          },
          name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          sourceCreatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceUpdatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceDeletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE UNIQUE INDEX "MonitoringReviewStatuses_statusId_deletedAt"
          ON "MonitoringReviewStatuses"
          ("statusId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringReviewStatuses"
          ADD CONSTRAINT "MonitoringReviewStatuses_statusId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringReviewStatuses_statusId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringReviews',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          reviewId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringReviewLinks',
              },
              key: 'reviewId',
            },
          },
          contentId: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          statusId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringReviewStatusLinks',
              },
              key: 'statusId',
            },
          },
          startDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          endDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          reviewType: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          reportDeliveryDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          outcome: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          hash: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          sourceCreatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceUpdatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceDeletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE UNIQUE INDEX "MonitoringReviews_reviewId_deletedAt"
          ON "MonitoringReviews"
          ("reviewId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringReviews"
          ADD CONSTRAINT "MonitoringReviews_reviewId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringReviews_reviewId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringReviews_statusId"
          ON "MonitoringReviews"
          ("statusId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringReviews_reviewId_statusId"
          ON "MonitoringReviews"
          ("reviewId", "statusId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringReviewGrantees',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          reviewId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringReviewLinks',
              },
              key: 'reviewId',
            },
          },
          granteeId: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          createTime: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updateTime: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updateBy: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          grantNumber: {
            allowNull: false,
            type: Sequelize.TEXT,
            references: {
              model: {
                tableName: 'GrantNumberLinks',
              },
              key: 'grantNumber',
            },
          },
          sourceCreatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceUpdatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceDeletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringReviewGrantees_reviewId"
          ON "MonitoringReviewGrantees"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringReviewGrantees_granteeId"
          ON "MonitoringReviewGrantees"
          ("granteeId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringReviewGrantees_grantNumber"
          ON "MonitoringReviewGrantees"
          ("grantNumber")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE UNIQUE INDEX "MonitoringReviewGrantees_reviewId_grantNumber_deletedAt"
          ON "MonitoringReviewGrantees"
          ("reviewId", "grantNumber", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringReviewGrantees"
          ADD CONSTRAINT "MonitoringReviewGrantees_reviewId_grantNumber_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringReviewGrantees_reviewId_grantNumber_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringFindingHistories',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          reviewId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringReviewLinks',
              },
              key: 'reviewId',
            },
          },
          findingHistoryId: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          hash: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          sourceCreatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceUpdatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceDeletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindingHistories_reviewId"
          ON "MonitoringFindingHistories"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindingHistories_findingHistoryId"
          ON "MonitoringFindingHistories"
          ("findingHistoryId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE UNIQUE INDEX "MonitoringFindingHistories_reviewId_findingHistoryId_deletedAt"
          ON "MonitoringFindingHistories"
          ("reviewId", "findingHistoryId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringFindingHistories"
          ADD CONSTRAINT "MonitoringFindingHistories_reviewId_findingHistoryId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringFindingHistories_reviewId_findingHistoryId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringClassSummaries',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          reviewId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringReviewLinks',
              },
              key: 'reviewId',
            },
          },
          grantNumber: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'GrantNumberLinks',
              },
              key: 'grantNumber',
            },
          },
          emotionalSupport: {
            type: Sequelize.DECIMAL(5, 4),
            allowNull: true,
          },
          classroomOrganization: {
            type: Sequelize.DECIMAL(5, 4),
            allowNull: true,
          },
          instructionalSupport: {
            type: Sequelize.DECIMAL(5, 4),
            allowNull: true,
          },
          reportDeliveryDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          hash: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          sourceCreatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceUpdatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          sourceDeletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringClassSummaries_reviewId"
          ON "MonitoringClassSummaries"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringClassSummaries_grantNumber"
          ON "MonitoringClassSummaries"
          ("grantNumber")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE UNIQUE INDEX "MonitoringClassSummaries_reviewId_grantNumber_deletedAt"
          ON "MonitoringClassSummaries"
          ("reviewId", "grantNumber", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringClassSummaries"
          ADD CONSTRAINT "MonitoringClassSummaries_reviewId_grantNumber_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringClassSummaries_reviewId_grantNumber_deletedAt";
      `,
        { transaction }
      )

      //-----------------------------------------------------------------------------------------

      // All the values read for ENV base on the names
      const ftpSettings = {
        host: 'ITAMS_MD_HOST',
        port: 'ITAMS_MD_PORT',
        username: 'ITAMS_MD_USERNAME',
        password: 'ITAMS_MD_PASSWORD',
      }

      /**
       * This cron expression breaks down as follows:
       *  0 - The minute when the job will run (in this case, 0 minutes past the hour)
       *  21 - The hour when the job will run (in this case, 11 pm)
       *  * - The day of the month when the job will run (in this case, any day of the month)
       *  * - The month when the job will run (in this case, any month)
       *  * - The day of the week when the job will run (in this case, any day of the week)
       * */
      const schedule = '0 7 * * *'

      const definitions = []
      definitions.push({
        fileName: 'AMS_ReviewStatus.xml',
        path: '.',
        encoding: 'utf16le',
        tableName: 'MonitoringReviewStatuses',
        keys: ['statusId'],
        remapDef: {
          StatusId: 'statusId',
          Name: 'name',
        },
      })
      definitions.push({
        fileName: 'AMS_Review.xml',
        path: '.',
        encoding: 'utf16le',
        tableName: 'MonitoringReviews',
        keys: ['reviewId'],
        remapDef: {
          ReviewId: 'reviewId',
          ContentId: 'contentId',
          StatusId: 'statusId',
          StartDate: 'startDate',
          EndDate: 'endDate',
          ReviewType: 'reviewType',
          ReportDeliveryDate: 'reportDeliveryDate',
          Outcome: 'outcome',
          '.': 'toHash.*',
        },
      })
      definitions.push({
        fileName: 'AMS_ReviewGrantee.xml',
        path: '.',
        encoding: 'utf16le',
        tableName: 'MonitoringReviewGrantees',
        keys: ['reviewId', 'granteeId'],
        remapDef: {
          ReviewId: 'reviewId',
          GranteeId: 'granteeId',
          CreateTime: 'createTime',
          UpdateTime: 'updateTime',
          UpdateBy: 'updateBy',
          GrantNumber: 'grantNumber',
        },
      })
      definitions.push({
        fileName: 'AMS_FindingHistory.xml',
        path: '.',
        encoding: 'utf16le',
        tableName: 'MonitoringFindingHistories',
        keys: ['findingHistoryId'],
        remapDef: {
          FindingHistoryId: 'findingHistoryId',
          ReviewId: 'reviewId',
          '.': 'toHash.*',
        },
      })
      definitions.push({
        fileName: 'AMS_CLASS_SUMMARYGrants.xml',
        path: '.',
        encoding: 'utf16le',
        tableName: 'MonitoringClassSummaries',
        keys: ['reviewId'],
        remapDef: {
          ReviewId: 'reviewId',
          GrantNumber: 'grantNumber',
          Domain_ES: 'emotionalSupport',
          Domain_CO: 'classroomOrganization',
          Domain_IS: 'instructionalSupport',
          ReportDeliveryDate: 'reportDeliveryDate',
          '.': 'toHash.*',
        },
      })

      await queryInterface.sequelize.query(
        /* sql */ `
      INSERT INTO "Imports" (
        "name",
        "ftpSettings",
        "path",
        "fileMask",
        "schedule",
        "enabled",
        "definitions",
        "createdAt",
        "updatedAt"
      ) values (
        'ITAMS Monitoring Data',
        '${JSON.stringify(ftpSettings)}',
        '/ProdTTAHome',
        '[0-9]{4}_[0-9]{2}_[0-9]{2}_XML[.]zip',
        '${schedule}',
        true,
        '${JSON.stringify(definitions)}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
      `,
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await removeTables(queryInterface, transaction, [
        'MonitoringReviewStatuses',
        'MonitoringReviews',
        'MonitoringReviewGrantees',
        'MonitoringFindingHistories',
        'GrantNumberLinks',
        'MonitoringReviewLinks',
        'MonitoringReviewStatusLinks',
      ])
      await await queryInterface.sequelize.query(
        /* sql */ `
      DELETE FROM "Imports"
      WHERE "name" = 'ITAMS Monitoring Data';
      `,
        { transaction }
      )
    })
  },
}
