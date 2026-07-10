import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('QA dashboard SQL parity guards', () => {
  const sql = readFileSync(path.join(__dirname, 'dashboard.sql'), 'utf8');

  it('uses reportId filter variables for report ID matching', () => {
    expect(sql).toContain("COALESCE(report_id_filter, '[]')::json");
    expect(sql).toContain('!= report_id_not_filter');
    expect(sql).not.toMatch(
      /json_array_elements_text\(COALESCE\(report_text_filter, '\[\]'\)::json\)\s+AS value[\s\S]*CONCAT\('R', LPAD\(a\."regionId"::text, 2, '0'\), '-AR-', a\.id\) ~\* value::text/
    );
  });

  it('uses inclusive date boundary logic for start/end date filters', () => {
    expect(sql).toContain('a."startDate"::date <= (');
    expect(sql).toContain('a."startDate"::date >= (');
    expect(sql).toContain('a."endDate"::date <= (');
    expect(sql).toContain('a."endDate"::date >= (');
  });

  it('does not require inner-join chain for reportText/topic filtering', () => {
    expect(sql).toContain('COALESCE(a."additionalNotes", \'\') ~* value::text');
    expect(sql).toContain('FROM "ActivityReportGoals" arg');
    expect(sql).toContain('FROM "ActivityReportObjectives" aro');
    expect(sql).toContain('FROM "NextSteps" ns');
  });

  it('matches specialist roles from author OR collaborators', () => {
    expect(sql).toContain('WHERE ur."userId" = a."userId"');
    expect(sql).toContain('WHERE arc."activityReportId" = a.id');
  });

  it('expands grouped program types like the activity report API', () => {
    expect(sql).toContain(
      "value::text = 'EHS' AND p.\"programType\" IN ('EHS', 'AIAN EHS', 'Migrant EHS')"
    );
    expect(sql).toContain(
      "value::text = 'HS' AND p.\"programType\" IN ('HS', 'AIAN HS', 'Migrant HS')"
    );
  });

  it('filters FEI root cause from activity report goal field responses at report level', () => {
    expect(sql).toContain('JOIN "ActivityReportGoalFieldResponses" argfr');
    expect(sql).toContain('arg.id = argfr."activityReportGoalId"');
    expect(sql).toContain('arg."activityReportId" = a.id');
  });
});
