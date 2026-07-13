import { Op } from 'sequelize';
import { myReportsScopes } from './myReports';

const USER_ID = 355;

const literalVal = (result) => {
  const clauses = result[Op.or];
  return clauses?.[0] ? clauses[0].val : undefined;
};

describe('goals myReportsScopes', () => {
  it('builds a goal subquery for the legacy "Creator" label', () => {
    const result = myReportsScopes(USER_ID, ['Creator'], false);
    const sql = literalVal(result);
    expect(sql).toContain('"Goal"."id"');
    expect(sql).toContain('"ActivityReports"."userId"');
    expect(sql).not.toContain('IN ()');
  });

  it('builds a goal subquery for the renamed "AR creator" label', () => {
    const result = myReportsScopes(USER_ID, ['AR creator'], false);
    const sql = literalVal(result);
    expect(sql).toContain('"Goal"."id"');
    expect(sql).toContain('"ActivityReports"."userId"');
    expect(sql).not.toContain('IN ()');
  });

  it('recognizes the renamed collaborator and approver labels', () => {
    const collab = literalVal(myReportsScopes(USER_ID, ['AR collaborator'], false));
    expect(collab).toContain('"ActivityReportCollaborators"."userId"');

    const approver = literalVal(myReportsScopes(USER_ID, ['AR approver'], false));
    expect(approver).toContain('"ActivityReportApprovers"."userId"');
  });

  it('excludes goals for the renamed collaborator and approver labels', () => {
    const collab = literalVal(myReportsScopes(USER_ID, ['AR collaborator'], true));
    // Exclude path wraps the subquery in NOT IN:
    expect(collab).toContain('"Goal"."id"  NOT  IN');
    expect(collab).toContain('"ActivityReportCollaborators"."userId"');

    const approver = literalVal(myReportsScopes(USER_ID, ['AR approver'], true));
    expect(approver).toContain('"Goal"."id"  NOT  IN');
    expect(approver).toContain('"ActivityReportApprovers"."userId"');
  });

  it('returns a no-op scope when only Training Report roles are selected on include', () => {
    const result = myReportsScopes(USER_ID, ['TR POC'], false);
    expect(result).toEqual({});
  });

  it('returns a no-op scope when only Training Report roles are selected on exclude', () => {
    const result = myReportsScopes(USER_ID, ['TR POC'], true);
    expect(result).toEqual({});
  });

  it('returns an empty scope when no roles are provided', () => {
    expect(myReportsScopes(USER_ID, [], false)).toEqual({});
  });
});
