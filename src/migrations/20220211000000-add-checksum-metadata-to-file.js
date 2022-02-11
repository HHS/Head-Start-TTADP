/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.addColumn('files', 'checksums', { type: Sequelize.DataTypes.JSON, allowNull: true }, { transaction }),
    queryInterface.addColumn('files', 'metadata', { type: Sequelize.DataTypes.JSON, allowNull: true }, { transaction }),
  ])),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.removeColumn('files', 'checksums', { transaction }),
    queryInterface.removeColumn('files', 'metadata', { transaction }),
  ])),
};
