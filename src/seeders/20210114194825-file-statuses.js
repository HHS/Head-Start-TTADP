module.exports = {
  up: async (queryInterface) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    await queryInterface.bulkInsert('FileStatuses', [
      {
        id: 1,
        statusDescription: 'PENDING',
      },
      {
        id: 2,
        statusDescription: 'SCANNING',
      },
      {
        id: 3,
        statusDescription: 'APPROVED',
      },
      {
        id: 4,
        statusDescription: 'REJECTED',
      },
    ]);
    await queryInterface.sequelize.query('ALTER SEQUENCE "FileStatuses_id_seq" RESTART WITH 5;');
  },

  down: async (queryInterface) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('FileStatuses', null, {});
  },
};
