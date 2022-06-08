module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TYPE "enum_Users_role" ADD VALUE \'National Center\';');
    await queryInterface.sequelize.query('ALTER TYPE "enum_ActivityReports_creatorRole" ADD VALUE \'National Center\';');
  },
  down: async (queryInterface) => {
    let query = 'DELETE FROM pg_enum WHERE enumlabel = \'National Center\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_Users_role\')';
    await queryInterface.sequelize.query(query);
    query = 'DELETE FROM pg_enum WHERE enumlabel = \'National Center\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_ActivityReports_creatorRole\')';
    await queryInterface.sequelize.query(query);
  },
};
