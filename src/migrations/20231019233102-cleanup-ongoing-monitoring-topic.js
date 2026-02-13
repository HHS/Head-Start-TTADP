const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      const oldTopicId = 127
      const newTopicId = 130

      await queryInterface.sequelize.query(
        `
      -- Update activity report topics.
      UPDATE "ActivityReports"
      SET
          topics = array_replace(topics, 'Ongoing Monitoring Management System', 'Ongoing Monitoring and Continuous Improvement')
        WHERE topics @> ARRAY['Ongoing Monitoring Management System']::varchar[];

        -- Update "ActivityReportObjectiveTopics" table.
        UPDATE "ActivityReportObjectiveTopics"
        SET "topicId" = ${newTopicId}
        WHERE "topicId" = ${oldTopicId};

        -- Update "ObjectiveTemplateTopics" table.
        UPDATE "ObjectiveTemplateTopics"
        SET "topicId" = ${newTopicId}
        WHERE "topicId" = ${oldTopicId};

        -- Update "ObjectiveTopics" table.
        UPDATE "ObjectiveTopics"
        SET "topicId" = ${newTopicId}
        WHERE "topicId" = ${oldTopicId};

        -- Update "RoleTopics" table.
        UPDATE "RoleTopics"
        SET "topicId" = ${newTopicId}
        WHERE "topicId" = ${oldTopicId};
   `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
