module.exports = {
  up: async (queryInterface) => {
    queryInterface.sequelize.transaction((t) => Promise.all([
      queryInterface.removeColumn('Files', 'attachmentType', { transaction: t }),
      queryInterface.sequelize.query('DROP TYPE public."enum_Files_attachmentType";', { transaction: t }),
    ]));
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'Files',
      'attachmentType',
      {
        type: Sequelize.DataTypes.ENUM(['ATTACHMENT', 'RESOURCE']),
      },
    );
  },
};
