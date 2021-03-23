module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TYPE "enum_Files_status" ADD VALUE \'SCANNING_FAILED\';');
  },
  down: async (queryInterface) => {
    const query = 'DELETE FROM pg_enum WHERE enumlabel = \'SCANNING_FAILED\' AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_Files_status\')';
    await queryInterface.sequelize.query(query);
  },
};
