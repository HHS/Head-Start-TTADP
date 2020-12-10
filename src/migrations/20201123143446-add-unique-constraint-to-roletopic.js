module.exports = {
  up: (queryInterface) => queryInterface.addConstraint('RoleTopics', ['roleId', 'topicId'], {
    type: 'unique',
    name: 'unique_roleId_topicId',
  }),

  down: (queryInterface) => queryInterface.removeConstraint('RoleTopics', 'unique_roleId_topicId'),
};
