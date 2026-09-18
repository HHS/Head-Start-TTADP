module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ValidationRecords', 'context', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    // Adding enforcement here rather than an additional validation.
    await queryInterface.addIndex('Citations', ['mfid'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Citations', ['mfid']);
    await queryInterface.removeColumn('ValidationRecords', 'context');
  },
};
