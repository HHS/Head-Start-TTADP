module.exports = {
  up: (queryInterface) => queryInterface.addConstraint('Permissions', {
    type: 'unique',
    name: 'unique_userId_scopeId_regionId',
    fields: ['userId', 'scopeId', 'regionId'],
  }),

  down: (queryInterface) => queryInterface.removeConstraint('Permissions', 'unique_userId_scopeId_regionId'),
};
