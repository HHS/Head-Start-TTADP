module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.renameTable('ActivityParticipants', 'ActivityRecipients', { transaction: t });
    await queryInterface.renameColumn('ActivityReports', 'participantType', 'activityRecipientType', { transaction: t });
  }),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.renameTable('ActivityRecipients', 'ActivityParticipants', { transaction: t });
    await queryInterface.renameColumn('ActivityReports', 'activityRecipientType', 'participantType', { transaction: t });
  }),
};
