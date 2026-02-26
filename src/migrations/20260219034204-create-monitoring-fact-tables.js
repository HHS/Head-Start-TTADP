const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable('DeliveredReviews', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        mrid: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
        },
        review_uuid: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        review_type: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        review_status: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        report_delivery_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        report_start_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        complete_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        complete: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        corrected: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('Citations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        mfid: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        finding_uuid: {
          type: Sequelize.TEXT,
          allowNull: false,
          unique: true,
        },
        raw_status: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        calculated_status: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        active: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        last_review_delivered: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        raw_finding_type: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        calculated_finding_type: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        source_category: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        finding_deadline: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        reported_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        closed_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        citation: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        standard_text: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        guidance_category: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        initial_review_uuid: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        initial_narrative: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        initial_determination: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        initial_report_delivery_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        latest_review_uuid: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        latest_narrative: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        latest_determination: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        latest_report_delivery_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        latest_goal_closure: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        active_through: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('DeliveredReviewCitations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        deliveredReviewId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        citationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });

      await queryInterface.createTable('GrantDeliveredReviews', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        grantId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        deliveredReviewId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        recipient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        recipient_name: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        region_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });

      await queryInterface.createTable('GrantCitations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        grantId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        citationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        recipient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        recipient_name: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        region_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });

      await queryInterface.addIndex('DeliveredReviewCitations', ['deliveredReviewId', 'citationId'], {
        unique: true,
        name: 'delivered_review_citations_delivered_review_id_citation_id_uniq',
        transaction,
      });

      await queryInterface.addIndex('GrantDeliveredReviews', ['grantId', 'deliveredReviewId'], {
        unique: true,
        name: 'grant_delivered_reviews_grant_id_delivered_review_id_uniq',
        transaction,
      });

      await queryInterface.addIndex('GrantCitations', ['grantId', 'citationId'], {
        unique: true,
        name: 'grant_citations_grant_id_citation_id_uniq',
        transaction,
      });

      // Foreign key constraints for DeliveredReviewCitations
      await queryInterface.addConstraint('DeliveredReviewCitations', {
        fields: ['deliveredReviewId'],
        type: 'foreign key',
        name: 'delivered_review_citations_delivered_review_id_fk',
        references: { table: 'DeliveredReviews', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });
      await queryInterface.addConstraint('DeliveredReviewCitations', {
        fields: ['citationId'],
        type: 'foreign key',
        name: 'delivered_review_citations_citation_id_fk',
        references: { table: 'Citations', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });

      // Foreign key constraints for GrantDeliveredReviews
      await queryInterface.addConstraint('GrantDeliveredReviews', {
        fields: ['grantId'],
        type: 'foreign key',
        name: 'grant_delivered_reviews_grant_id_fk',
        references: { table: 'Grants', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });
      await queryInterface.addConstraint('GrantDeliveredReviews', {
        fields: ['deliveredReviewId'],
        type: 'foreign key',
        name: 'grant_delivered_reviews_delivered_review_id_fk',
        references: { table: 'DeliveredReviews', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });

      // Foreign key constraints for GrantCitations
      await queryInterface.addConstraint('GrantCitations', {
        fields: ['grantId'],
        type: 'foreign key',
        name: 'grant_citations_grant_id_fk',
        references: { table: 'Grants', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });
      await queryInterface.addConstraint('GrantCitations', {
        fields: ['citationId'],
        type: 'foreign key',
        name: 'grant_citations_citation_id_fk',
        references: { table: 'Citations', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.dropTable('GrantCitations', { transaction });
      await queryInterface.dropTable('GrantDeliveredReviews', { transaction });
      await queryInterface.dropTable('DeliveredReviewCitations', { transaction });
      await queryInterface.dropTable('Citations', { transaction });
      await queryInterface.dropTable('DeliveredReviews', { transaction });
    });
  },
};
