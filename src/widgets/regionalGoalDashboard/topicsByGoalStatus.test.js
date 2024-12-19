import topicsByGoalStatus from './topicsByGoalStatus';
import db from '../../models';
import { GOAL_STATUS } from './goalsByStatus';

jest.mock('../../models', () => ({
  Goal: {
    findAll: jest.fn(),
  },
}));

describe('topicsByGoalStatus', () => {
  let response;

  beforeAll(async () => {
    db.Goal.findAll.mockResolvedValue([
      {
        id: 1,
        status: GOAL_STATUS.IN_PROGRESS,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 1,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': 'Health',
      },
      {
        id: 2,
        status: GOAL_STATUS.IN_PROGRESS,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 2,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': 'Education',
      },
      {
        id: 3,
        status: GOAL_STATUS.IN_PROGRESS,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 1,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': 'Health',
      },
    ]);

    response = await topicsByGoalStatus({ goal: { id: [1, 2, 3] } });
  });

  it('calculates the correct number of topics', () => {
    expect(response.length).toBe(2);
  });

  it('calculates the correct number of goals per topic', () => {
    const healthTopic = response.find((t) => t.topic === 'Health');
    const educationTopic = response.find((t) => t.topic === 'Education');
    expect(healthTopic.total).toBe(2);
    expect(educationTopic.total).toBe(1);
  });
});
