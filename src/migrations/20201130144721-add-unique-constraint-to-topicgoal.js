module.exports = {
  up: (queryInterface) => queryInterface.addConstraint('TopicGoals', ['topicId', 'goalId'], {
    type: 'unique',
    name: 'unique_topicId_goalId',
  }),

  down: (queryInterface) => queryInterface.removeConstraint('TopicGoals', 'unique_topicId_goalId'),
};
