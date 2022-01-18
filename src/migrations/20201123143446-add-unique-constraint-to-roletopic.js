module.exports = {
  up: (queryInterface) => queryInterface.addConstraint('RoleTopics', {
    type: 'unique',
    name: 'unique_roleId_topicId',
    fields: ['roleId', 'topicId'],
  }),

  down: (queryInterface) => queryInterface.removeConstraint('RoleTopics', 'unique_roleId_topicId'),
};
