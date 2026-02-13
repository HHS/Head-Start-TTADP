const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.createTable(
        'MonitoringGranteeLinks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
          },
          granteeId: {
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

      await queryInterface.sequelize.query(
        /* sql */ `
      INSERT INTO "MonitoringGranteeLinks"
      (
        "granteeId",
        "createdAt",
        "updatedAt",
        "deletedAt"
      )
      SELECT
        "granteeId",
        MIN("createdAt") "createdAt",
        MAX("updatedAt") "updatedAt",
        MAX("deletedAt") "deletedAt"
      FROM "MonitoringReviewGrantees"
      GROUP BY 1;
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringStandardLinks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
          },
          standardId: {
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
        'MonitoringFindingStatusLinks',
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
        'MonitoringFindingHistoryStatusLinks',
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
        'MonitoringFindingLinks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
          },
          findingId: {
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
        'MonitoringFindingStatuses',
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
                tableName: 'MonitoringFindingStatusLinks',
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

      await queryInterface.createTable(
        'MonitoringFindings',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          findingId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringFindingLinks',
              },
              key: 'findingId',
            },
          },
          statusId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringFindingStatusLinks',
              },
              key: 'statusId',
            },
          },
          findingType: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          source: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          correctionDeadLine: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          reportedDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          closedDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          hash: {
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
          CREATE UNIQUE INDEX "MonitoringFindings_findingId_deletedAt"
          ON "MonitoringFindings"
          ("findingId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringFindings"
          ADD CONSTRAINT "MonitoringFindings_findingId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringFindings_findingId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindings_statusId"
          ON "MonitoringFindings"
          ("statusId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindings_findingId_statusId"
          ON "MonitoringFindings"
          ("findingId", "statusId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringFindingGrants',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          findingId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringFindingLinks',
              },
              key: 'findingId',
            },
          },
          granteeId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringGranteeLinks',
              },
              key: 'granteeId',
            },
          },
          statusId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringFindingStatusLinks',
              },
              key: 'statusId',
            },
          },
          findingType: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          source: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          correctionDeadLine: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          reportedDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          closedDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          hash: {
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
          CREATE UNIQUE INDEX "MonitoringFindingGrants_findingId_granteeId_deletedAt"
          ON "MonitoringFindingGrants"
          ("findingId", "granteeId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringFindingGrants"
          ADD CONSTRAINT "MonitoringFindingGrants_findingId_granteeId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringFindingGrants_findingId_granteeId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindingGrants_statusId"
          ON "MonitoringFindingGrants"
          ("statusId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindingGrants_granteeId"
          ON "MonitoringFindingGrants"
          ("granteeId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          CREATE INDEX "MonitoringFindingGrants_findingId_granteeId_statusId"
          ON "MonitoringFindingGrants"
          ("findingId", "granteeId", "statusId")
          WHERE "deletedAt" IS NULL;
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringFindingStandards',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          findingId: {
            type: Sequelize.TEXT,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringFindingLinks',
              },
              key: 'findingId',
            },
          },
          standardId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringStandardLinks',
              },
              key: 'standardId',
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
          CREATE UNIQUE INDEX "MonitoringFindingStandards_findingId_standardId_deletedAt"
          ON "MonitoringFindingStandards"
          ("findingId", "standardId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringFindingStandards"
          ADD CONSTRAINT "MonitoringFindingStandards_findingId_standardId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringFindingStandards_findingId_standardId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringStandards',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          standardId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'MonitoringStandardLinks',
              },
              key: 'standardId',
            },
          },
          contentId: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          citation: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          text: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          guidance: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          citable: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          hash: {
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
          CREATE UNIQUE INDEX "MonitoringStandards_standardId_deletedAt"
          ON "MonitoringStandards"
          ("standardId", "deletedAt");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "MonitoringStandards"
          ADD CONSTRAINT "MonitoringStandards_standardId_deletedAt_unique"
          UNIQUE USING INDEX "MonitoringStandards_standardId_deletedAt";
      `,
        { transaction }
      )

      await queryInterface.changeColumn(
        'MonitoringReviewGrantees',
        'granteeId',
        {
          type: Sequelize.TEXT,
          allowNull: false,
          references: {
            model: 'MonitoringGranteeLinks',
            key: 'granteeId',
          },
        },
        { transaction }
      )

      await queryInterface.createTable(
        'MonitoringFindingHistoryStatuses',
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
                tableName: 'MonitoringFindingHistoryStatusLinks',
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

      await queryInterface.addColumn(
        'MonitoringFindingHistories',
        'findingId',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: null,
          references: {
            model: {
              tableName: 'MonitoringFindingLinks',
            },
            key: 'findingId',
          },
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'MonitoringFindingHistories',
        'statusId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          references: {
            model: {
              tableName: 'MonitoringFindingHistoryStatusLinks',
            },
            key: 'statusId',
          },
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'MonitoringFindingHistories',
        'narrative',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'MonitoringFindingHistories',
        'ordinal',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'MonitoringFindingHistories',
        'determination',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'MonitoringReviews',
        'reportAttachmentId',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'MonitoringReviews',
        'name',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
      Update "Imports" i
      SET
        definitions = (
          SELECT jsonb_agg(elem) || jsonb_build_array(
          jsonb_build_object(
            'keys', jsonb_build_array('findingId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_Finding.xml',
            'remapDef', jsonb_build_object(
              '.', 'toHash.*',
              'FindingId', 'findingId',
              'StatusId', 'statusId',
              'FindingType', 'findingType',
              'Source', 'source',
              'CorrectionDeadLine', 'correctionDeadLine',
              'ReportDate', 'reportDate',
              'ClosedDate', 'closedDate'
            ),
            'tableName', 'MonitoringFindings'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('findingId', 'granteeId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_FindingGrants.xml',
            'remapDef', jsonb_build_object(
              '.', 'toHash.*',
              'FindingId', 'findingId',
              'GranteeId', 'granteeId',
              'StatusId', 'statusId',
              'FindingType', 'findingType',
              'Source', 'source',
              'CorrectionDeadLine', 'correctionDeadLine',
              'ReportDate', 'reportDate',
              'ClosedDate', 'closedDate'
            ),
            'tableName', 'MonitoringFindingGrants'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('findingHistoryId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_FindingHistory.xml',
            'remapDef', jsonb_build_object(
              '.', 'toHash.*',
              'FindingHistoryId', 'findingHistoryId',
              'FindingId', 'findingId',
              'ReviewId', 'reviewId',
              'StatusId', 'statusId',
              'Narrative', 'narrative',
              'Ordinal', 'ordinal',
              'Determination', 'determination'
            ),
            'tableName', 'MonitoringFindingHistories'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('statusId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_FindingHistoryStatus.xml',
            'remapDef', jsonb_build_object(
              'StatusId', 'statusId',
              'Name', 'name'
            ),
            'tableName', 'MonitoringFindingHistoryStatuses'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('findingId', 'standardId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_FindingStandard.xml',
            'remapDef', jsonb_build_object(
              'FindingId', 'findingId',
              'StandardId', 'standardId'
            ),
            'tableName', 'MonitoringFindingStandards'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('statusId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_FindingStatus.xml',
            'remapDef', jsonb_build_object(
              'StatusId', 'statusId',
              'Name', 'name'
            ),
            'tableName', 'MonitoringFindingStatuses'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('reviewId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_Review.xml',
            'remapDef', jsonb_build_object(
              '.', 'toHash.*',
              'ReviewId', 'reviewId',
              'ContentId', 'contentId',
              'StatusId', 'statusId',
              'StartDate', 'startDate',
              'EndDate', 'endDate',
              'ReviewType', 'reviewType',
              'ReportDeliveryDate', 'reportDeliveryDate',
              'ReportAttachmentId', 'reportAttachmentId',
              'Outcome', 'outcome',
              'ReviewId', 'reviewId',
              'Name', 'name'
            ),
            'tableName', 'MonitoringReviews'
          ),
          jsonb_build_object(
            'keys', jsonb_build_array('standardId'),
            'path', '.',
            'encoding', 'utf16le',
            'fileName', 'AMS_Standard.xml',
            'remapDef', jsonb_build_object(
              '.', 'toHash.*',
              'ContentId', 'contentId',
              'StandardId', 'standardId',
              'Citation', 'citation',
              'Text', 'text',
              'Guidance', 'guidance',
              'Citable', 'citable'
            ),
            'tableName', 'MonitoringStandards'
          )
        )
          FROM (
              SELECT elem
              FROM jsonb_array_elements(i.definitions) AS elem
              WHERE elem->>'fileName' != 'AMS_FindingHistory.xml'
              OR elem->>'fileName' != 'AMS_Review.xml'
          ) subquery
      ),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE i.id = 1;
      `,
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.removeColumn('MonitoringReviews', 'reportAttachmentId', { transaction })
      await queryInterface.removeColumn('MonitoringFindingHistories', 'determination', {
        transaction,
      })
      await queryInterface.removeColumn('MonitoringFindingHistories', 'ordinal', { transaction })
      await queryInterface.removeColumn('MonitoringReviews', 'narrative', { transaction })
      await queryInterface.removeColumn('MonitoringReviews', 'statusId', { transaction })
      await queryInterface.removeColumn('MonitoringReviews', 'findingId', { transaction })
      await queryInterface.changeColumn(
        'MonitoringReviews',
        'granteeId',
        {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        { transaction }
      )
      await removeTables(queryInterface, transaction, [
        'MonitoringStandards',
        'MonitoringFindingStatuses',
        'MonitoringFindingStandards',
        'MonitoringFindingHistoryStatuses',
        'MonitoringFindingGrants',
        'MonitoringFindings',
        'MonitoringFindingLinks',
        'MonitoringFindingHistoryStatusLinks',
        'MonitoringFindingStatusLinks',
        'MonitoringStandardLinks',
        'MonitoringGranteeLinks',
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
