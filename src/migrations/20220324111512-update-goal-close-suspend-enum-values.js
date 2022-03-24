module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TYPE "enum_Goals_closeSuspendReason" ADD VALUE \'Key staff turnover / vacancies\' BEFORE \'Key staff turnover\';');
    await queryInterface.sequelize.query('ALTER TYPE "enum_Goals_closeSuspendReason" ADD VALUE \'Regional Office request\';');
  },
  down: async (queryInterface) => {
    let query = 'DELETE FROM pg_enum WHERE enumlabel = \'Key staff turnover / vacancies\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_Goals_closeSuspendReason\')';
    await queryInterface.sequelize.query(query);
    query = 'DELETE FROM pg_enum WHERE enumlabel = \'Regional Office request\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_Goals_closeSuspendReason\')';
    await queryInterface.sequelize.query(query);
  },
};
