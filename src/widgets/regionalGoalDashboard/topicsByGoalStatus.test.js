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
        topic: 'Health',
        total: 2,
        'Not Started': 0,
        'In Progress': 2,
        Closed: 0,
        Suspended: 0,
      },
      {
        topic: 'Education',
        total: 1,
        'Not Started': 0,
        'In Progress': 1,
        Closed: 0,
        Suspended: 0,
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
    expect(healthTopic.statuses['In Progress']).toBe(2);
    expect(educationTopic.total).toBe(1);
    expect(educationTopic.statuses['In Progress']).toBe(1);
  });

  it('handles the case where the topic is not in the accumulator', async () => {
    db.Goal.findAll.mockResolvedValue([
      {
        topic: 'Safety',
        total: 1,
        'Not Started': 1,
        'In Progress': 0,
        Closed: 0,
        Suspended: 0,
      },
    ]);

    const funcResponse = await topicsByGoalStatus({ goal: { id: [1] } });
    const safetyTopic = funcResponse.find((t) => t.topic === 'Safety');
    expect(safetyTopic.total).toBe(1);
    expect(safetyTopic.statuses['Not Started']).toBe(1);
  });

  it('handles the case where the topic is already in the accumulator', async () => {
    db.Goal.findAll.mockResolvedValue([
      {
        topic: 'Health',
        total: 2,
        'Not Started': 0,
        'In Progress': 0,
        Closed: 2,
        Suspended: 0,
      },
    ]);

    const funcResponse = await topicsByGoalStatus({ goal: { id: [1, 2] } });
    const healthTopic = funcResponse.find((t) => t.topic === 'Health');
    expect(healthTopic).toStrictEqual({
      topic: 'Health',
      statuses: {
        'Not Started': 0,
        'In Progress': 0,
        Suspended: 0,
        Closed: 2,
      },
      total: 2,
    });
  });
});
