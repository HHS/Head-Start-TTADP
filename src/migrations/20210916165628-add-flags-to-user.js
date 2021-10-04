module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.addColumn(
        'Users',
        'flags',
        { type: Sequelize.DataTypes.ENUM(['grantee_record_page']) },
        { transaction },
      );
      await queryInterface.sequelize.query('ALTER TABLE "Users" ALTER COLUMN flags TYPE public."enum_Users_flags"[] USING CASE WHEN flags IS NULL THEN \'{}\' ELSE ARRAY[flags] END; ALTER TABLE "Users" ALTER COLUMN flags SET DEFAULT \'{}\';', { transaction });
    },
  ),
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Users', 'flags');
  },
};
