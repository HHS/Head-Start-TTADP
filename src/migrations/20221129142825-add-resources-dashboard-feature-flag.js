module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
        DO $$ BEGIN
          ALTER TYPE "enum_Users_flags" ADD VALUE 'resources_dashboard';
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
  },

  down: async () => {
  },
};
