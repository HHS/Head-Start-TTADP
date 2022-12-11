/* eslint-disable max-len */
// Resources Phase 2: Create structure to support collecting and maintaining metadata for resources
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const METADATA_PROCESSING_STATES_TYPES = {
        QUEUEING: 'QUEUEING',
        QUEUEING_FAILED: 'QUEUEING_FAILED',
        QUEUED: 'QUEUED',
        IDENTIFYING_FRAMEWORK: 'IDENTIFYING_FRAMEWORK',
        CAPTURING: 'CAPTURING',
        CAPTURING_FAILED: 'CAPTURING_FAILED',
        PROCESSING: 'PROCESSING',
        PROCESSING_FAILED: 'PROCESSING_FAILED',
        PROCESSED: 'PROCESSED',
        REPROCESSING_REQUESTED: 'REPROCESSING_REQUESTED',
      };

      const FRAMEWORK_TYPE = {
        DRUPAL: 'Drupal ',
        WORDPRESS: 'WordPress',
        JOOMLA: 'Joomla',
        WIX: 'Wix',
        SQUARESPACE: 'Squarespace',
        BLOGGER: 'Blogger',
      };

      const SITE_ACCESSOR = {
        DRUPAL_JSON: '?_format=json',
        DRUPAL_HAL_JSON: '?_format=hal_json',
        WORDPRESS_JSON_POSTS: '/wp-json/wp/v2/posts',
      };

      const loggedUser = '0';
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

      // make table to hold metadata about resources
      await queryInterface.createTable('ResourceMetadata', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        resourceId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        metaDataStatus: {
          allowNull: false,
          default: null,
          type: Sequelize.DataTypes.ENUM(Object.values(METADATA_PROCESSING_STATES_TYPES)),
        },
        frameworkType: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.ENUM(Object.values(FRAMEWORK_TYPE)),
        },
        siteAccesor: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.STRING,
        },
        data: {
          allowNull: false,
          type: Sequelize.JSON,
        },
        created: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        changed: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        title: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        field_taxonomy_national_centers: {
          allowNull: true,
          type: Sequelize.JSON,
        },
        field_taxonomy_topic: {
          allowNull: true,
          type: Sequelize.JSON,
        },
        langcode: {
          allowNull: true,
          type: Sequelize.JSON,
        },
        field_content: {
          allowNull: true,
          type: Sequelize.JSON,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      //await queryInterface.sequelize.query('UPDATE "ActivityReportObjectives" SET "status" = \'Complete\' WHERE "status" = \'Completed\'', { transaction });
    },
  ),
  down: async () => {
  },
};
