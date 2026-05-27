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

  it('maps conductMethod.in to an IN where condition', () => {
    const scope = topicToQuery.conductMethod.in(['email', 'virtual']);

    expect(scope.conductMethod[Op.in]).toEqual(['email', 'virtual']);
  });

  it('maps conductMethod.nin to a NOT IN where condition and includes nulls', () => {
    const scope = topicToQuery.conductMethod.nin(['phone']);

    expect(scope[Op.or]).toEqual([
      {
        conductMethod: {
          [Op.notIn]: ['phone'],
        },
      },
      {
        conductMethod: null,
      },
    ]);
  });

  it('returns empty scope when conductMethod.in receives an empty array', () => {
    const scope = topicToQuery.conductMethod.in([]);

    expect(scope).toEqual({});
  });

  it('returns empty scope when conductMethod.nin receives an empty array', () => {
    const scope = topicToQuery.conductMethod.nin([]);

    expect(scope).toEqual({});
  });

  it('returns empty scope when conductMethod.in receives invalid method values', () => {
    const scope = topicToQuery.conductMethod.in(['invalid', 'email']);

    expect(scope).toEqual({});
  });

  it('returns empty scope when conductMethod.nin receives invalid method values', () => {
    const scope = topicToQuery.conductMethod.nin(['phone', 'not_a_method']);

    expect(scope).toEqual({});
  });

  it('returns empty scope when conductMethod.in receives null or undefined', () => {
    const scopeNull = topicToQuery.conductMethod.in(null);
    const scopeUndefined = topicToQuery.conductMethod.in(undefined);

    expect(scopeNull).toEqual({});
    expect(scopeUndefined).toEqual({});
  });

  it('returns empty scope when conductMethod.nin receives null or undefined', () => {
    const scopeNull = topicToQuery.conductMethod.nin(null);
    const scopeUndefined = topicToQuery.conductMethod.nin(undefined);

    expect(scopeNull).toEqual({});
    expect(scopeUndefined).toEqual({});
  });

  it('successfully handles all valid conduct methods', () => {
    const scope = topicToQuery.conductMethod.in(['email', 'phone', 'in_person', 'virtual']);

    expect(scope.conductMethod[Op.in]).toEqual(['email', 'phone', 'in_person', 'virtual']);
  });
});

describe('collabReports stateCode scope', () => {
  it('maps stateCode.in to an IN subquery on CollabReportActivityStates', () => {
    const scope = topicToQuery.stateCode.in(['CA', 'TX']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain('FROM "CollabReportActivityStates"');
    expect(sql).toContain('"activityStateCode" IN');
    expect(sql).toContain("'CA'");
    expect(sql).toContain("'TX'");
  });

  it('maps stateCode.nin to a NOT IN subquery on CollabReportActivityStates', () => {
    const scope = topicToQuery.stateCode.nin(['NY']);
    const sql = scope.id[Op.notIn].val;

    expect(sql).toContain('FROM "CollabReportActivityStates"');
    expect(sql).toContain('"activityStateCode" IN');
    expect(sql).toContain("'NY'");
  });

  it('filters out soft-deleted activity states', () => {
    const scope = topicToQuery.stateCode.in(['WA']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain('"deletedAt" IS NULL');
  });

  it('normalizes comma-separated state codes in a single string', () => {
    const scope = topicToQuery.stateCode.in(['CA, TX, WA']);
    const sql = scope.id[Op.in].val;

    expect(sql).toContain("'CA'");
    expect(sql).toContain("'TX'");
    expect(sql).toContain("'WA'");
  });

  it('returns an empty scope when no state codes are provided', () => {
    const scope = topicToQuery.stateCode.in([' ,  ']);

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

    expect(sql).toContain('"CollabReport"."createdAt"::date BETWEEN');
    expect(sql).toContain('2026-01-01');
    expect(sql).toContain('2026-01-31');
  });

  it('maps startDate.in to createdAt BETWEEN start and end date', () => {
    const scope = topicToQuery.startDate.in(['2026/02/01-2026/02/28']);
    const sql = scope[Op.and][0].val;

    expect(sql).toContain('"CollabReport"."createdAt"::date BETWEEN');
    expect(sql).toContain('2026-02-01');
    expect(sql).toContain('2026-02-28');
  });

  it('returns empty scope when startDate range is invalid', () => {
    const scope = topicToQuery.startDate.win(['2026/01/01']);

    expect(scope).toEqual({});
  });
});

describe('collabReports activityType scope', () => {
  it('maps activityType.in with "state" to isStateActivity IN [true]', () => {
    const scope = topicToQuery.activityType.in(['state']);

    expect(scope.isStateActivity[Op.in]).toEqual([true]);
  });

  it('maps activityType.in with "regional" to isStateActivity IN [false]', () => {
    const scope = topicToQuery.activityType.in(['regional']);

    expect(scope.isStateActivity[Op.in]).toEqual([false]);
  });

  it('maps activityType.in with both values to isStateActivity IN [true, false]', () => {
    const scope = topicToQuery.activityType.in(['state', 'regional']);

    expect(scope.isStateActivity[Op.in]).toEqual([true, false]);
  });

  it('maps activityType.nin with "state" to isStateActivity NOT IN [true] and includes nulls', () => {
    const scope = topicToQuery.activityType.nin(['state']);

    expect(scope[Op.or]).toEqual([
      { isStateActivity: { [Op.notIn]: [true] } },
      { isStateActivity: { [Op.is]: null } },
    ]);
  });

  it('maps activityType.nin with "regional" to isStateActivity NOT IN [false] and includes nulls', () => {
    const scope = topicToQuery.activityType.nin(['regional']);

    expect(scope[Op.or]).toEqual([
      { isStateActivity: { [Op.notIn]: [false] } },
      { isStateActivity: { [Op.is]: null } },
    ]);
  });

  it('returns empty scope when activityType.in receives an invalid type', () => {
    const scope = topicToQuery.activityType.in(['invalid']);

    expect(scope).toEqual({});
  });

  it('returns empty scope when activityType.nin receives an invalid type', () => {
    const scope = topicToQuery.activityType.nin(['not_a_type']);

    expect(scope).toEqual({});
  });

  it('returns empty scope when activityType.in receives an empty array', () => {
    const scope = topicToQuery.activityType.in([]);

    expect(scope).toEqual({});
  });

  it('returns empty scope when activityType.nin receives an empty array', () => {
    const scope = topicToQuery.activityType.nin([]);

    expect(scope).toEqual({});
  });

  it('filters out invalid types and maps only valid ones', () => {
    const scope = topicToQuery.activityType.in(['state', 'invalid']);

    expect(scope.isStateActivity[Op.in]).toEqual([true]);
  });
});

describe('collabReports participants scope', () => {
  it('maps participants.in to an exact array containment where clause', () => {
    const scope = topicToQuery.participants.in([
      'Head Start Collaboration Office',
      'Regional Office staff',
    ]);

    expect(scope[Op.or]).toHaveLength(2);
    expect(scope[Op.or][0].val).toContain('"CollabReport"."participants" @> ARRAY');
    expect(scope[Op.or][0].val).toContain("'Head Start Collaboration Office'");
    expect(scope[Op.or][1].val).toContain("'Regional Office staff'");
  });

  it('maps participants.nin to a negated array containment where clause and includes nulls', () => {
    const scope = topicToQuery.participants.nin(['Head Start Collaboration Office']);

    expect(scope[Op.or]).toHaveLength(2);
    expect(scope[Op.or][0][Op.and]).toHaveLength(1);
    expect(scope[Op.or][0][Op.and][0].val).toContain('NOT ("CollabReport"."participants" @> ARRAY');
    expect(scope[Op.or][0][Op.and][0].val).toContain("'Head Start Collaboration Office'");
    expect(scope[Op.or][1].val).toContain('"CollabReport"."participants" IS NULL');
  });

  it('returns empty scope when participants.in receives invalid values', () => {
    const scope = topicToQuery.participants.in(['not_a_valid_participant']);

    expect(scope).toEqual({});
  });

  it('returns empty scope when participants.nin receives empty array', () => {
    const scope = topicToQuery.participants.nin([]);

    expect(scope).toEqual({});
  });
});
