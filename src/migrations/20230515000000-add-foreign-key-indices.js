module.exports = {
  up: (queryInterface) =>
    queryInterface.sequelize.transaction((transaction) =>
      Promise.all([
        // Add foreign key indices.
        // In link tables, add a compound index plus a single-column index for the second key in the
        // compound index. The compound index works about as well as a single-column index for the
        // first key even when the second is not referenced. In cases where there's a unique
        // constraint, postgres already supplies an index so we only add the second key index.
        // We're also not adding indexes on low-cardinality foreign keys like region, roleId,
        // and topicId
        queryInterface.addIndex('ActivityReportGoals', ['goalId'], { transaction }),
        queryInterface.addIndex('ActivityReportCollaborators', ['activityReportId'], {
          transaction,
        }),
        queryInterface.addIndex('ActivityReportObjectives', ['activityReportId', 'objectiveId'], {
          transaction,
        }),
        queryInterface.addIndex('ActivityReportObjectives', ['objectiveId'], { transaction }),
        queryInterface.addIndex('ActivityReportObjectiveFiles', ['fileId'], { transaction }),
        queryInterface.addIndex('Objectives', ['goalId'], { transaction }),
        queryInterface.addIndex('Objectives', ['objectiveTemplateId'], { transaction }),
        queryInterface.addIndex('ObjectiveFiles', ['objectiveId', 'fileId'], { transaction }),
        queryInterface.addIndex('ObjectiveFiles', ['fileId'], { transaction }),
        // Skipping creating a userProvidedUrl index because it's just a text field
        queryInterface.addIndex('ObjectiveResources', ['objectiveId'], { transaction }),
        queryInterface.addIndex('ObjectiveTopics', ['objectiveId'], { transaction }),
        queryInterface.addIndex('ObjectiveTemplateFiles', ['objectiveTemplateId', 'fileId'], {
          transaction,
        }),
        queryInterface.addIndex('ObjectiveTemplateFiles', ['fileId'], { transaction }),
        // Skipping creating a userProvidedUrl index because it's just a text field
        queryInterface.addIndex('ObjectiveTemplateResources', ['objectiveTemplateId'], {
          transaction,
        }),
        queryInterface.addIndex('ObjectiveTemplateTopics', ['objectiveTemplateId'], {
          transaction,
        }),
        queryInterface.addIndex('Goals', ['grantId'], { transaction }),
        queryInterface.addIndex('Goals', ['goalTemplateId'], { transaction }),
        queryInterface.addIndex('GoalTemplateObjectiveTemplates', ['goalTemplateId', 'objectiveTemplateId'], { transaction }),
        queryInterface.addIndex('GoalTemplateObjectiveTemplates', ['objectiveTemplateId'], {
          transaction,
        }),
        queryInterface.addIndex('GroupGrants', ['groupId', 'grantId'], { transaction }),
        queryInterface.addIndex('GroupGrants', ['grantId'], { transaction }),

        // Add predicate key indices with significant enough cardinality for it to be worthwhile and
        // which we actually use for filtering.
        queryInterface.addIndex('ActivityReports', ['startDate'], { transaction }),
        queryInterface.addIndex('ActivityReports', ['updatedAt'], { transaction }),
        queryInterface.addIndex('ActivityReports', ['approvedAt'], { transaction }),
        queryInterface.addIndex('ActivityReports', ['createdAt'], { transaction }),
        queryInterface.addIndex('Goals', ['createdAt'], { transaction }),
      ])
    ),

  down: (queryInterface) =>
    queryInterface.sequelize.transaction((transaction) =>
      Promise.all([
        // Remove foreign key indices.
        queryInterface.removeIndex('ActivityReportGoals', ['goalId'], { transaction }),
        queryInterface.removeIndex('ActivityReportCollaborators', ['activityReportId'], {
          transaction,
        }),
        queryInterface.removeIndex('ActivityReportObjectives', ['activityReportId', 'objectiveId'], { transaction }),
        queryInterface.removeIndex('ActivityReportObjectives', ['objectiveId'], { transaction }),
        queryInterface.removeIndex('ActivityReportObjectiveFiles', ['fileId'], { transaction }),
        queryInterface.removeIndex('Objectives', ['goalId'], { transaction }),
        queryInterface.removeIndex('Objectives', ['objectiveTemplateId'], { transaction }),
        queryInterface.removeIndex('ObjectiveFiles', ['objectiveId', 'fileId'], { transaction }),
        queryInterface.removeIndex('ObjectiveFiles', ['fileId'], { transaction }),
        queryInterface.removeIndex('ObjectiveResources', ['objectiveId'], { transaction }),
        queryInterface.removeIndex('ObjectiveTopics', ['objectiveId'], { transaction }),
        queryInterface.removeIndex('ObjectiveTemplateFiles', ['objectiveTemplateId', 'fileId'], {
          transaction,
        }),
        queryInterface.removeIndex('ObjectiveTemplateFiles', ['fileId'], { transaction }),
        queryInterface.removeIndex('ObjectiveTemplateResources', ['objectiveTemplateId'], {
          transaction,
        }),
        queryInterface.removeIndex('ObjectiveTemplateTopics', ['objectiveTemplateId'], {
          transaction,
        }),
        queryInterface.removeIndex('Goals', ['grantId'], { transaction }),
        queryInterface.removeIndex('Goals', ['goalTemplateId'], { transaction }),
        queryInterface.removeIndex('GoalTemplateObjectiveTemplates', ['goalTemplateId', 'objectiveTemplateId'], { transaction }),
        queryInterface.removeIndex('GoalTemplateObjectiveTemplates', ['objectiveTemplateId'], {
          transaction,
        }),
        queryInterface.removeIndex('GroupGrants', ['groupId', 'grantId'], { transaction }),
        queryInterface.removeIndex('GroupGrants', ['grantId'], { transaction }),

        // Remove predicate key indices
        queryInterface.removeIndex('ActivityReports', ['startDate'], { transaction }),
        queryInterface.removeIndex('ActivityReports', ['updatedAt'], { transaction }),
        queryInterface.removeIndex('ActivityReports', ['approvedAt'], { transaction }),
        queryInterface.removeIndex('ActivityReports', ['createdAt'], { transaction }),
        queryInterface.removeIndex('Goals', ['createdAt'], { transaction }),
      ])
    ),
}
