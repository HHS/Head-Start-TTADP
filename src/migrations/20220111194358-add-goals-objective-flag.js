module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_Users_flags" ADD VALUE 'recipient_goals_objectives';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  },

  down: async () => {
    // Is there a way to revert this? Not sure
  },
};
