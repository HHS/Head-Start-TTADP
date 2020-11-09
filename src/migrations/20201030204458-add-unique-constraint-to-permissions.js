module.exports = {
  up: (queryInterface) => queryInterface.addConstraint('Permissions', ['userId', 'scopeId', 'regionId'], {
    type: 'unique',
    name: 'unique_userId_scopeId_regionId',
  }),

  down: (queryInterface) => queryInterface.removeConstraint('Permissions', 'unique_userId_scopeId_regionId'),
};
