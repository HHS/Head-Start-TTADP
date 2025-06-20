module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TYPE "enum_ActivityReports_status" ADD VALUE \'deleted\';');
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DELETE FROM pg_enum WHERE enumlabel = \'deleted\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_ActivityReports_status\')');
  },
};
