import frequencyGraph from './frequencyGraph';
import db, {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Goal,
  Grant,
  Objective,
  Recipient,
  Topic,
} from '../models';
import { createReport, destroyReport } from '../testUtils';
import filtersToScopes from '../scopes';

describe('frequency graph widget', () => {
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;
  let reportFive;
  let goal;
  let olderGoal;
  let objective;
  let olderObjective;
  let topic;
  let scopes;

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
      reason: ['Child Incident'],
      topics: ['Fiscal / Budget'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportFour = await createReport({
      reason: ['Change in Scope', 'Child Incident'],
      topics: ['Five-Year Grant', 'Home Visiting', 'Fiscal / Budget'],
      activityRecipients: [{ grantId: 555 }],
    });
    reportFive = await createReport({
      reason: [],
      topics: [],
      activityRecipients: [{ grantId: 555 }],
    });

    const recipient = await Recipient.findOne({
      attributes: ['id'],
      include: {
        model: Grant,
        as: 'grants',
        where: { id: 555 },
      },
    });

    const recipientId = recipient.id;

    topic = await Topic.create({
      name: 'Media Consumption',
    });

    goal = await Goal.create({
      name: 'Watch more television to improve concentration',
      status: 'In Progress',
      grantId: 555,
    });

    olderGoal = await Goal.create({
      name: 'Watch no television to improve concentration',
      status: 'In Progress',
      grantId: 555,
    });

    objective = await Objective.create({
      title: 'Find a new show',
      status: 'In Progress',
      goalId: goal.id,
    });

    olderObjective = await Objective.create({
      title: 'Destroy expensive electronics',
      status: 'In Progress',
      goalId: olderGoal.id,
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

    await ActivityReportGoal.bulkCreate([
      reportOne.id, reportTwo.id, reportThree.id, reportFour.id,
    ].map((id) => ({
      activityReportId: id,
      goalId: olderGoal.id,
    })));

    await ActivityReportObjective.bulkCreate([
      reportOne.id, reportTwo.id, reportThree.id, reportFour.id,
    ].map((id) => ({
      activityReportId: id,
      objectiveId: olderObjective.id,
    })));

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aro.id,
      topicId: topic.id,
    });

    const reportIds = [
      reportOne.id, reportTwo.id, reportThree.id, reportFour.id, reportFive.id,
    ];

    const baseScopes = await filtersToScopes({
      'recipientId.ctn': [recipientId],
    });

    scopes = {
      ...baseScopes,
      activityReport: {
        id: reportIds,
      },
    };
  });

  afterAll(async () => {
    await ActivityReportObjectiveTopic.destroy({
      where: {
        topicId: topic.id,
      },
      individualHooks: true,
    });

    await ActivityReportGoal.destroy({
      where: {
        goalId: [goal.id, olderGoal.id],
      },
      individualHooks: true,
    });

    await ActivityReportObjective.destroy({
      where: {
        objectiveId: [objective.id, olderObjective.id],
      },
      individualHooks: true,
    });

    await Objective.destroy({
      where: {
        id: [objective.id, olderObjective.id],
      },
      individualHooks: true,
      force: true,
    });

    await Goal.destroy({
      where: {
        id: [goal.id, olderGoal.id],
      },
      individualHooks: true,
      force: true,
    });

    await Topic.destroy({
      where: {
        id: topic.id,
      },
      individualHooks: true,
      force: true,
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
    const res = await frequencyGraph(scopes);

    const { topics } = res;

    expect(topics.find((r) => r.category === 'Home Visiting').count).toBe(3);
    expect(topics.find((r) => r.category === 'Five-Year Grant').count).toBe(2);
    expect(topics.find((r) => r.category === 'Fiscal / Budget').count).toBe(2);
    expect(topics.find((r) => r.category === 'Nutrition').count).toBe(0);
  });

  it('returns count of topics with additional associated report', async () => {
    const res = await frequencyGraph(scopes);

    const { topics } = res;
    expect(topics.find((r) => r.category === 'Media Consumption').count).toBe(1);
    expect(topics.find((r) => r.category === 'Home Visiting').count).toBe(3);
    expect(topics.find((r) => r.category === 'Five-Year Grant').count).toBe(2);
    expect(topics.find((r) => r.category === 'Fiscal / Budget').count).toBe(2);
    expect(topics.find((r) => r.category === 'Nutrition').count).toBe(0);
  });
});
