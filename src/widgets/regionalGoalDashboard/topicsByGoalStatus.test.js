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

  it('handles the case where the topic is not in the accumulator', async () => {
    db.Goal.findAll.mockResolvedValue([
      {
        id: 1,
        status: GOAL_STATUS.NOT_STARTED,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 3,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': 'Safety',
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const response = await topicsByGoalStatus({ goal: { id: [1] } });
    const safetyTopic = response.find((t) => t.topic === 'Safety');
    expect(safetyTopic.total).toBe(1);
    expect(safetyTopic.statuses[GOAL_STATUS.NOT_STARTED]).toBe(1);
  });

  it('handles the case where .topic.topic is undefined', async () => {
    db.Goal.findAll.mockResolvedValue([
      {
        id: 1,
        status: GOAL_STATUS.NOT_STARTED,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 3,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': undefined,
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const response = await topicsByGoalStatus({ goal: { id: [1] } });
    const undefinedTopic = response.find((t) => t.topic === undefined);
    expect(undefinedTopic).toBeUndefined();
  });

  it('handles the case where the topic is already in the accumulator', async () => {
    db.Goal.findAll.mockResolvedValue([
      {
        id: 1,
        status: GOAL_STATUS.COMPLETE,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 1,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': 'Health',
      },
      {
        id: 2,
        status: GOAL_STATUS.COMPLETE,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': 1,
        'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': 'Health',
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const response = await topicsByGoalStatus({ goal: { id: [1, 2] } });
    const healthTopic = response.find((t) => t.topic === 'Health');
    expect(healthTopic).toStrictEqual({
      topic: 'Health',
      statuses: {
        Draft: 0,
        'Not Started': 0,
        'In Progress': 0,
        Suspended: 0,
        Closed: 0,
        undefined: Number.NaN,
      },
      total: Number.NaN,
    });
  });
});
