module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction((transaction) => Promise.all([
    queryInterface.addIndex('ActivityReportCollaborators', ['userId', 'activityReportId'], { unique: true, transaction }),
    queryInterface.addIndex('ActivityRecipients', ['grantId', 'activityReportId'], { unique: true, transaction }),
    queryInterface.addIndex('ActivityRecipients', ['nonGranteeId', 'activityReportId'], { unique: true, transaction }),
  ])),

  down: async (queryInterface) => {
    queryInterface.sequelize.transaction((transaction) => Promise.all([
      queryInterface.removeIndex('ActivityReportCollaborators', ['userId', 'activityReportId'], { transaction }),
      queryInterface.removeIndex('ActivityRecipients', ['grantId', 'activityReportId'], { transaction }),
      queryInterface.removeIndex('ActivityRecipients', ['nonGranteeId', 'activityReportId'], { transaction }),
    ]));
  },
};
