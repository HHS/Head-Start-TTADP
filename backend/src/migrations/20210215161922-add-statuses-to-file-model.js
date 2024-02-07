module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TYPE "enum_Files_status" ADD VALUE \'QUEUEING_FAILED\';');
    await queryInterface.sequelize.query('ALTER TYPE "enum_Files_status" ADD VALUE \'SCANNING_QUEUED\';');
  },
  down: async (queryInterface) => {
    let query = 'DELETE FROM pg_enum WHERE enumlabel = \'QUEUEING_FAILED\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_Files_status\')';
    await queryInterface.sequelize.query(query);
    query = 'DELETE FROM pg_enum WHERE enumlabel = \'SCANNING_QUEUED\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_Files_status\')';
    await queryInterface.sequelize.query(query);
  },
};
