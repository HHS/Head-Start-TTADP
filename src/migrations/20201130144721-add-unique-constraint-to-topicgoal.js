module.exports = {
  up: (queryInterface) => queryInterface.addConstraint('TopicGoals', {
    type: 'unique',
    name: 'unique_topicId_goalId',
    fields: ['topicId', 'goalId'],
  }),

  down: (queryInterface) => queryInterface.removeConstraint('TopicGoals', 'unique_topicId_goalId'),
};
