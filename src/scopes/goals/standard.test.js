import { GoalTemplate } from '../../models';
import { withoutStandard, withStandard } from './standard';
import { createGoal, createGrant, filtersToScopes, Goal, Op, sequelize } from './testHelpers';

describe('goals/standard', () => {
  let grant;
  let templateFEI;
  let templateERSEA;
  let goalFEI;
  let goalERSEA;
  let goalNoStandard;
  const createdGoalIds = [];

  beforeAll(async () => {
    templateFEI = await GoalTemplate.findOne({ where: { standard: 'FEI' } });
    if (!templateFEI) throw new Error('No FEI template found — seeders may not have run');

    templateERSEA = await GoalTemplate.findOne({ where: { standard: 'ERSEA' } });
    if (!templateERSEA) throw new Error('No ERSEA template found — seeders may not have run');

    grant = await createGrant();

    goalFEI = await createGoal({
      grantId: grant.id,
      goalTemplateId: templateFEI.id,
      name: 'FEI goal',
      status: 'Not Started',
    });
    createdGoalIds.push(goalFEI.id);

    goalERSEA = await createGoal({
      grantId: grant.id,
      goalTemplateId: templateERSEA.id,
      name: 'ERSEA goal',
      status: 'Not Started',
    });
    createdGoalIds.push(goalERSEA.id);

    goalNoStandard = await createGoal({
      grantId: grant.id,
      name: 'No standard goal',
      status: 'Not Started',
    });
    createdGoalIds.push(goalNoStandard.id);
  });

  afterAll(async () => {
    if (createdGoalIds.length) {
      await Goal.destroy({ where: { id: createdGoalIds }, force: true, individualHooks: true });
    }
    await sequelize.close();
  });

  it('returns goals matching a single standard', async () => {
    const { goal: scope } = await filtersToScopes({ 'standard.in': ['FEI'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    expect(found.length).toBe(1);
    expect(found[0].id).toBe(goalFEI.id);
  });

  it('returns goals matching multiple standards', async () => {
    const { goal: scope } = await filtersToScopes({ 'standard.in': ['FEI', 'ERSEA'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    expect(found.length).toBe(2);
    const foundIds = found.map((g) => g.id);
    expect(foundIds).toContain(goalFEI.id);
    expect(foundIds).toContain(goalERSEA.id);
  });

  it('returns no goals when the included standards array is empty', async () => {
    const { goal: scope } = await filtersToScopes({ 'standard.in': [] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    expect(found).toHaveLength(0);
  });

  it('excludes goals matching a standard', async () => {
    const { goal: scope } = await filtersToScopes({ 'standard.nin': ['FEI'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).not.toContain(goalFEI.id);
    expect(foundIds).toContain(goalERSEA.id);
  });

  it('excludes goals matching multiple standards', async () => {
    const { goal: scope } = await filtersToScopes({ 'standard.nin': ['FEI', 'ERSEA'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).not.toContain(goalFEI.id);
    expect(foundIds).not.toContain(goalERSEA.id);
  });

  it('does not exclude any goals when the excluded standards array is empty', async () => {
    const { goal: scope } = await filtersToScopes({ 'standard.nin': [] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).toContain(goalFEI.id);
    expect(foundIds).toContain(goalERSEA.id);
    expect(foundIds).toContain(goalNoStandard.id);
  });
});

describe('goals/standard empty filters', () => {
  it('returns a false literal when included standards are empty', () => {
    const scope = withStandard([]);
    expect(scope[Op.and].val).toBe('1=0');
  });

  it('returns a true literal when excluded standards are empty', () => {
    const scope = withoutStandard([]);
    expect(scope[Op.and].val).toBe('1=1');
  });
});
