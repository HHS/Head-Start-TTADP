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
          type: Sequelize.BIGINT,
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, {
        indexes: [
          {
            unique: true,
            fields: ['statusId'],
          },
        ],
        transaction,
      });

      await queryInterface.createTable('MonitoringReviews', {
        id: {
          type: Sequelize.BIGINT,
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, {
        indexes: [
          {
            unique: true,
            fields: ['review_id'],
          },
          {
            fields: ['status_id'],
          },
          {
            fields: ['review_id', 'status_id'],
          },
        ],
        transaction,
      });

      await queryInterface.createTable('MonitoringReviewGrantees', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        review_id: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        grantee_id: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        create_time: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        update_time: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        update_by: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        grant_number: {
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
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, {
        indexes: [
          {
            fields: ['review_id'],
          },
          {
            fields: ['grantee_id'],
          },
          {
            fields: ['grant_number'],
          },
          {
            fields: ['review_id', 'grant_number'],
          },
        ],
        transaction,
      });

      await queryInterface.createTable('MonitoringFindingHistories', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        review_id: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        finding_history_id: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        hash: {
          type: Sequelize.TEXT,
          allowNull: true,
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
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, {
        indexes: [
          {
            unique: true,
            fields: ['review_id'],
          },
          {
            unique: true,
            fields: ['finding_history_id'],
          },
        ],
        transaction,
      });
      await queryInterface.createTable('MonitoringClassSummaries', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        review_id: {
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, {
        indexes: [
          {
            fields: ['review_id'],
          },
          {
            fields: ['grantNumber'],
          },
          {
            fields: ['review_id', 'grantNumber'],
          },
        ],
        transaction,
      });

      //-----------------------------------------------------------------------------------------

      const ftpSettings = {
        host: 'sftp.ams20.com', // TODO: need host
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
        tableName: 'MonitoringReviewStatuses',
        remapDef: {
          StatusId: 'status_id',
          Name: 'name',
        },
      });
      definitions.push({
        fileName: 'AMS_Review.xml',
        tableName: 'MonitoringReviews',
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
        tableName: 'MonitoringReviewGrantees',
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
        tableName: 'MonitoringFindingHistories',
        remapDef: {
          FindingHistoryId: 'findingHistoryId',
          ReviewId: 'reviewId',
          '*': 'toHash.*',
        },
      });
      definitions.push({
        fileName: 'AMS_CLASS_SUMMARYGrants.xml',
        tableName: 'MonitoringClassSummaries',
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
        "file",
        "schedule",
        "enabled",
        "definitions",
      ) values (
        'ITAMS Monitoring Data'
        '${JSON.stringify(ftpSettings)}',
        '/ProdTTAHome',
        '[0-9]{4}_[0-9]{2}_[0-9]{2}_XML[.]zip',
        '${schedule}',
        true,
        '${JSON.stringify(definitions)}'
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
    });
  },
};
