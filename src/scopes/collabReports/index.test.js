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

describe('collabReports activityPurpose scope', () => {
  it('maps activityPurpose.in to an IN subquery on CollabReportReasons', () => {
    const scope = topicToQuery.activityPurpose.in(['participate_work_groups']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain('FROM "CollabReportReasons"');
    expect(sql).toContain('"reasonId" IN');
    expect(sql).toContain("'participate_work_groups'");
  });

  it('maps activityPurpose.nin to a NOT IN subquery on CollabReportReasons', () => {
    const scope = topicToQuery.activityPurpose.nin(['agg_regional_data']);
    const sql = scope.id[Op.notIn].val;

    expect(sql).toContain('FROM "CollabReportReasons"');
    expect(sql).toContain('"reasonId" IN');
    expect(sql).toContain("'agg_regional_data'");
  });

  it('supports multiple reason IDs in a single IN subquery', () => {
    const scope = topicToQuery.activityPurpose.in([
      'participate_work_groups',
      'support_coordination',
    ]);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain("'participate_work_groups'");
    expect(sql).toContain("'support_coordination'");
  });

  it('filters deletedAt IS NULL in the subquery', () => {
    const scope = topicToQuery.activityPurpose.in(['develop_presentations']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain('"deletedAt" IS NULL');
  });

  it('returns an empty scope when no reason IDs are provided', () => {
    const scope = topicToQuery.activityPurpose.in([' ,  ']);

    expect(scope).toEqual({});
  });

  it('returns an empty scope for an empty array', () => {
    const scope = topicToQuery.activityPurpose.in([]);

    expect(scope).toEqual({});
  });
});
