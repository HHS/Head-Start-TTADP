import frequencyGraph from './frequencyGraph';
import db, {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Goal,
  Objective,
  ObjectiveTopic,
  Topic,

} from '../models';
import { createReport, destroyReport } from '../testUtils';

describe('frequency graph widget', () => {
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;
  let reportFive;
  let goal;
  let objective;
  let topic;

  beforeAll(async () => {
    reportOne = await createReport({
      reason: ['Change in Scope'],
      topics: ['Home Visiting'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportTwo = await createReport({
      reason: ['Change in Scope', 'Complaint'],
      topics: ['Five-Year Grant', 'Home Visiting'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportThree = await createReport({
      reason: ['Child Incidents'],
      topics: ['Fiscal / Budget'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportFour = await createReport({
      reason: ['Change in Scope', 'Child Incidents'],
      topics: ['Five-Year Grant', 'Home Visiting', 'Fiscal / Budget'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportFive = await createReport({
      reason: [],
      topics: [],
      activityRecipients: [{ grantId: 555 }],
    });

    topic = await Topic.create({
      name: 'Media Consumption',
    });

    goal = await Goal.create({
      name: 'Watch more television to improve concentration',
      status: 'In Progress',
      grantId: 555,
    });

    objective = await Objective.create({
      title: 'Find a new show',
      status: 'In Progress',
      goalId: goal.id,
    });

    await ObjectiveTopic.create({
      topicId: topic.id,
      objectiveId: objective.id,
    });

    const aro = await ActivityReportObjective.create({
      activityReportId: reportFive.id,
      objectiveId: objective.id,
    });

    await ActivityReportGoal.create({
      activityReportId: reportFive.id,
      goalId: goal.id,
      status: goal.status,
    });

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aro.id,
      topicId: topic.id,
    });
  });

  afterAll(async () => {
    await ActivityReportObjectiveTopic.destroy({
      where: {
        topicId: topic.id,
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        goalId: goal.id,
      },
    });

    await ActivityReportObjective.destroy({
      where: {
        objectiveId: objective.id,
      },
    });

    await ObjectiveTopic.destroy({
      where: {
        topicId: topic.id,
      },
    });

    await Objective.destroy({
      where: {
        id: objective.id,
      },
    });

    await Goal.destroy({
      where: {
        id: goal.id,
      },
    });

    await Topic.destroy({
      where: {
        id: topic.id,
      },
    });

    await destroyReport(reportOne);
    await destroyReport(reportTwo);
    await destroyReport(reportThree);
    await destroyReport(reportFour);
    await destroyReport(reportFive);
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns count of topics', async () => {
    const res = await frequencyGraph({
      activityReport: {
        id: [reportOne.id, reportTwo.id, reportThree.id, reportFour.id],
      },
    });

    const { topics } = res;

    expect(topics.find((r) => r.category === 'Home Visiting').count).toBe(3);
    expect(topics.find((r) => r.category === 'Five-Year Grant').count).toBe(2);
    expect(topics.find((r) => r.category === 'Fiscal / Budget').count).toBe(2);
    expect(topics.find((r) => r.category === 'Nutrition').count).toBe(0);
  });

  it('returns count of reasons', async () => {
    const res = await frequencyGraph({
      activityReport: {
        id: [reportOne.id, reportTwo.id, reportThree.id, reportFour.id, reportFive.id],
      },
    });

    const { reasons } = res;

    expect(reasons.find((r) => r.category === 'Change in Scope').count).toBe(3);
    expect(reasons.find((r) => r.category === 'Complaint').count).toBe(1);
    expect(reasons.find((r) => r.category === 'Child Incidents').count).toBe(2);
    expect(reasons.find((r) => r.category === 'Full Enrollment').count).toBe(0);
  });

  it('returns count of topics with additional associated report', async () => {
    const res = await frequencyGraph({
      activityReport: {
        id: [reportOne.id, reportTwo.id, reportThree.id, reportFour.id, reportFive.id],
      },
    });

    const { topics } = res;

    expect(topics.filter((r) => r.count > 0).length).toBe(4);
    expect(topics.find((r) => r.category === 'Home Visiting').count).toBe(3);
    expect(topics.find((r) => r.category === 'Five-Year Grant').count).toBe(2);
    expect(topics.find((r) => r.category === 'Fiscal / Budget').count).toBe(2);
    expect(topics.find((r) => r.category === 'Nutrition').count).toBe(0);
    expect(topics.find((r) => r.category === 'Media Consumption').count).toBe(1);
  });
});
