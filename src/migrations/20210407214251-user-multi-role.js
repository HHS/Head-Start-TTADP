/* eslint-disable no-multi-str */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE "Users" ALTER COLUMN role TYPE public."enum_Users_role"[] \
    USING CASE WHEN role IS NULL THEN \'{}\' ELSE ARRAY[role] END; ALTER TABLE "Users" ALTER COLUMN role SET DEFAULT \'{}\';');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE "Users" ALTER COLUMN role DROP DEFAULT; ALTER TABLE "Users" ALTER COLUMN role TYPE public."enum_Users_role" \
    USING role[1];');
  },
};
