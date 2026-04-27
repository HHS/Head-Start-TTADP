import { Op } from 'sequelize';
import { topicToQuery } from './index';

const expectedModelNames = {
  goal: 'Goal',
  goalTemplate: 'GoalTemplate',
};

describe('collabReports goal scope', () => {
  it('maps goal.in to a goalTemplate title include filter', () => {
    const scope = topicToQuery.goal.in('School readiness, Family well-being');

    expect(scope.include).toHaveLength(1);
    expect(scope.include[0].as).toBe('goals');
    expect(scope.include[0].model.name).toBe(expectedModelNames.goal);

    expect(scope.include[0].include).toHaveLength(1);
    expect(scope.include[0].include[0].as).toBe('goalTemplate');
    expect(scope.include[0].include[0].model.name).toBe(expectedModelNames.goalTemplate);
    expect(scope.include[0].include[0].where.templateName[Op.in]).toEqual([
      'School readiness',
      'Family well-being',
    ]);
  });

  it('maps goal.nin to a NOT IN goalTemplate title include filter', () => {
    const scope = topicToQuery.goal.nin('Fiscal integrity');

    expect(scope.include).toHaveLength(1);
    expect(scope.include[0].as).toBe('goals');
    expect(scope.include[0].include).toHaveLength(1);
    expect(scope.include[0].include[0].as).toBe('goalTemplate');
    expect(scope.include[0].include[0].where.templateName[Op.notIn]).toEqual([
      'Fiscal integrity',
    ]);
  });

  it('normalizes whitespace and removes empty titles', () => {
    const scope = topicToQuery.goal.in('  Coaching  , ,  ERSEA ,   ');

    expect(scope.include[0].include[0].where.templateName[Op.in]).toEqual([
      'Coaching',
      'ERSEA',
    ]);
  });
});
