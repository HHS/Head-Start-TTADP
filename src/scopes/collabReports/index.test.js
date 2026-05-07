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

describe('collabReports startDate scope', () => {
  it('maps startDate.bef to createdAt <= date', () => {
    const scope = topicToQuery.startDate.bef(['2026/01/15']);
    const sql = scope[Op.and][0].val;

    expect(sql).toContain('"CollabReport"."createdAt" <=');
    expect(sql).toContain('2026-01-15');
  });

  it('maps startDate.aft to createdAt >= date', () => {
    const scope = topicToQuery.startDate.aft(['2026/01/15']);
    const sql = scope[Op.and][0].val;

    expect(sql).toContain('"CollabReport"."createdAt" >=');
    expect(sql).toContain('2026-01-15');
  });

  it('maps startDate.win to createdAt BETWEEN start and end date', () => {
    const scope = topicToQuery.startDate.win(['2026/01/01-2026/01/31']);
    const sql = scope[Op.and][0].val;

    expect(sql).toContain('"CollabReport"."createdAt" BETWEEN');
    expect(sql).toContain('2026-01-01');
    expect(sql).toContain('2026-01-31');
  });

  it('maps startDate.in to createdAt BETWEEN start and end date', () => {
    const scope = topicToQuery.startDate.in(['2026/02/01-2026/02/28']);
    const sql = scope[Op.and][0].val;

    expect(sql).toContain('"CollabReport"."createdAt" BETWEEN');
    expect(sql).toContain('2026-02-01');
    expect(sql).toContain('2026-02-28');
  });

  it('returns empty scope when startDate range is invalid', () => {
    const scope = topicToQuery.startDate.win(['2026/01/01']);

    expect(scope).toEqual({});
  });
});
