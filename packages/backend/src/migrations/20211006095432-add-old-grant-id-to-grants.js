module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Grants',
      'oldGrantId',
      {
        comment: 'Link to expired grant in order to retrieve legacy goals.',
        type: Sequelize.INTEGER,
      },
    );

    await queryInterface.addConstraint('Grants', {
      fields: ['oldGrantId'],
      type: 'foreign key',
      name: 'Grants_oldGrantId_fkey',
      references: {
        // Required field
        table: 'Grants',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('Grants', 'Grants_oldGrantId_fkey');
    await queryInterface.removeColumn('Grants', 'oldGrantId');
  },
};
