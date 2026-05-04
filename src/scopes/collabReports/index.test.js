import { Op } from 'sequelize';
import { topicToQuery } from './index';

describe('collabReports goal scope', () => {
  it('maps goal.in to an IN subquery using sequelize literal', () => {
    const scope = topicToQuery.goal.in(['School readiness, Family well-being']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain('FROM "CollabReportGoals"');
    expect(sql).toContain('INNER JOIN "GoalTemplates"');
    expect(sql).toContain('"standard" IN');
    expect(sql).toContain("'School readiness'");
    expect(sql).toContain("'Family well-being'");
  });

  it('maps goal.nin to a NOT IN subquery using sequelize literal', () => {
    const scope = topicToQuery.goal.nin(['Fiscal integrity']);
    const sql = scope.id[Op.notIn].val;

    expect(sql).toContain('FROM "CollabReportGoals"');
    expect(sql).toContain('"standard" IN');
    expect(sql).toContain("'Fiscal integrity'");
  });

  it('normalizes whitespace and removes empty titles', () => {
    const scope = topicToQuery.goal.in(['  Coaching  , ,  ERSEA ,   ']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain("'Coaching'");
    expect(sql).toContain("'ERSEA'");
  });

  it('returns an empty scope when no goal titles are provided', () => {
    const scope = topicToQuery.goal.in([' ,  ']);

    expect(scope).toEqual({});
  });
});
