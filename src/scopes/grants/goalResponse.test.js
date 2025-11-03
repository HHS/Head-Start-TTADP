/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  Grant,
  Goal,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  sequelize,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('grants/goalResponse', () => {
  let prompt;
  let goal1;
  let goal2;
  let goal3;
  let response1;
  let response2;
  let response3;

  beforeAll(async () => {
    await setupSharedTestData();

    prompt = await GoalTemplateFieldPrompt.findOne({
      where: { title: 'FEI root cause' },
    });

    goal1 = await Goal.create({
      name: 'Goal 6',
      status: 'In Progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-20'),
      grantId: sharedTestData.grants[1].id,
      createdVia: 'rtr',
    });

    goal2 = await Goal.create({
      name: 'Goal 7',
      status: 'In Progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-20'),
      grantId: sharedTestData.grants[2].id,
      createdVia: 'rtr',
    });

    goal3 = await Goal.create({
      name: 'Goal 8',
      status: 'In Progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-20'),
      grantId: sharedTestData.grants[3].id,
      createdVia: 'rtr',
    });

    response1 = await GoalFieldResponse.create({
      goalId: goal1.id,
      goalTemplateFieldPromptId: prompt.id,
      response: ['Community Partnerships'],
    });

    response2 = await GoalFieldResponse.create({
      goalId: goal2.id,
      goalTemplateFieldPromptId: prompt.id,
      response: ['Workforce', 'Family circumstances'],
    });

    response3 = await GoalFieldResponse.create({
      goalId: goal3.id,
      goalTemplateFieldPromptId: prompt.id,
      response: ['Facilities'],
    });
  });

  afterAll(async () => {
    const idsToDelete = [response1?.id, response2?.id, response3?.id].filter(Boolean);

    if (idsToDelete.length > 0) {
      await GoalFieldResponse.destroy({ where: { id: idsToDelete } });
    }

    await Goal.destroy({
      where: {
        id: [goal1.id, goal2.id, goal3.id],
      },
      individualHooks: true,
    });

    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('finds goals with responses', async () => {
    const filters = { 'goalResponse.in': ['Workforce'] };
    const { grant: scope } = await filtersToScopes(filters, 'goal');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.where, { id: [sharedTestData.grants[1].id, sharedTestData.grants[2].id, sharedTestData.grants[3].id] }] },
    });
    expect(found.length).toBe(1);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([sharedTestData.grants[2].id]));
  });

  it('finds goals without responses', async () => {
    const filters = { 'goalResponse.nin': ['Workforce'] };
    const { grant: scope } = await filtersToScopes(filters, 'goal');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.where, { id: [sharedTestData.grants[1].id, sharedTestData.grants[2].id, sharedTestData.grants[3].id] }] },
    });
    expect(found.length).toBe(2);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([sharedTestData.grants[1].id, sharedTestData.grants[3].id]));
  });

  it('prevents SQL injection via goalResponse.in parameter', async () => {
    const injectedInput = ['Workforce', "' OR 1=1 --"];

    const filters = { 'goalResponse.in': injectedInput };
    const { grant: scope } = await filtersToScopes(filters, 'goal');

    const found = await Grant.findAll({
      where: { [Op.and]: [scope.where, { id: [sharedTestData.grants[1].id, sharedTestData.grants[2].id, sharedTestData.grants[3].id] }] },
    });

    expect(found.length).toBe(1);
    expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([sharedTestData.grants[2].id]));
  });
});
