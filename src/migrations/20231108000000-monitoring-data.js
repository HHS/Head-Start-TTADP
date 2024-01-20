const { EMAIL_ACTIONS } = require('../constants');
const { prepMigration, removeTables } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable('MonitoringReviewStatuses', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        statusId: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
      }, {
        transaction,
      });

      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "MonitoringReviewStatuses_statusId"
          ON "MonitoringReviewStatuses"
          ("statusId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.createTable('MonitoringReviews', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reviewId: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        contentId: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        statusId: {
          type: Sequelize.INTEGER,
          allowNull: true,
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
      }, {
        transaction,
      });

      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "MonitoringReviews_reviewId"
          ON "MonitoringReviews"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringReviews_statusId"
          ON "MonitoringReviews"
          ("statusId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringReviews_reviewId_statusId"
          ON "MonitoringReviews"
          ("reviewId", "statusId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.createTable('MonitoringReviewGrantees', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reviewId: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        granteeId: {
          type: Sequelize.TEXT,
          allowNull: true,
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
          type: Sequelize.DATE,
        },
        grantNumber: {
          allowNull: false,
          type: Sequelize.TEXT,
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
      }, {
        transaction,
      });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringReviewGrantees_reviewId"
          ON "MonitoringReviewGrantees"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringReviewGrantees_granteeId"
          ON "MonitoringReviewGrantees"
          ("granteeId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringReviewGrantees_grantNumber"
          ON "MonitoringReviewGrantees"
          ("grantNumber")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "MonitoringReviewGrantees_reviewId_grantNumber"
          ON "MonitoringReviewGrantees"
          ("reviewId", "grantNumber")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.createTable('MonitoringFindingHistories', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reviewId: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        findingHistoryId: {
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
      }, {
        transaction,
      });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringFindingHistories_reviewId"
          ON "MonitoringFindingHistories"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringFindingHistories_findingHistoryId"
          ON "MonitoringFindingHistories"
          ("findingHistoryId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "MonitoringFindingHistories_reviewId_findingHistoryId"
          ON "MonitoringFindingHistories"
          ("reviewId", "findingHistoryId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.createTable('MonitoringClassSummaries', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reviewId: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        grantNumber: {
          type: Sequelize.TEXT,
          allowNull: true,
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
      }, {
        transaction,
      });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringClassSummaries_reviewId"
          ON "MonitoringClassSummaries"
          ("reviewId")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX "MonitoringClassSummaries_grantNumber"
          ON "MonitoringClassSummaries"
          ("grantNumber")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "MonitoringClassSummaries_reviewId_grantNumber"
          ON "MonitoringClassSummaries"
          ("reviewId", "grantNumber")
          WHERE "deletedAt" IS NULL;
      `, { transaction });

      //-----------------------------------------------------------------------------------------

      const ftpSettings = {
        host: 'sftp.ams20.gov', // TODO: need host
        port: 22, // TODO: need port
        username: 'tta_ro', // TODO: need username
        password: '', // THE name of the ENV that holds the password
      };

      /**
       * This cron expression breaks down as follows:
       *  0 - The minute when the job will run (in this case, 0 minutes past the hour)
       *  21 - The hour when the job will run (in this case, 11 pm)
       *  * - The day of the month when the job will run (in this case, any day of the month)
       *  * - The month when the job will run (in this case, any month)
       *  * - The day of the week when the job will run (in this case, any day of the week)
       * */
      const schedule = '0 21 * * *';

      const definitions = [];
      definitions.push({
        fileName: 'AMS_ReviewStatus.xml',
        encoding: 'utf16le',
        tableName: 'MonitoringReviewStatuses',
        keys: ['status_id'],
        remapDef: {
          StatusId: 'status_id',
          Name: 'name',
        },
      });
      definitions.push({
        fileName: 'AMS_Review.xml',
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
          '*': 'toHash.*',
        },
      });
      definitions.push({
        fileName: 'AMS_ReviewGrantee.xml',
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
      });
      definitions.push({
        fileName: 'AMS_FindingHistory.xml',
        encoding: 'utf16le',
        tableName: 'MonitoringFindingHistories',
        keys: ['findingHistoryId'],
        remapDef: {
          FindingHistoryId: 'findingHistoryId',
          ReviewId: 'reviewId',
          '*': 'toHash.*',
        },
      });
      definitions.push({
        fileName: 'AMS_CLASS_SUMMARYGrants.xml',
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
          '*': 'toHash.*',
        },
      });

      await queryInterface.sequelize.query(/* sql */`
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
      `, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await removeTables(queryInterface, transaction, [
        'MonitoringReviewStatuses',
        'MonitoringReviews',
        'MonitoringReviewGrantees',
        'MonitoringFindingHistories',
      ]);
      await await queryInterface.sequelize.query(/* sql */`
      DELETE FROM "Imports"
      WHERE "name" = 'ITAMS Monitoring Data';
      `, { transaction });
    });
  },
};
