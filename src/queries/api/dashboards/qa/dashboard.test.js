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

  it('matches report text with set-based LIKE queries instead of correlated regex scans', () => {
    expect(sql).toContain('report_text_search AS (');
    expect(sql).toContain('report_text_matching_reports AS (');
    expect(sql).toContain("LOWER(COALESCE(a.context, '')) LIKE rts.search_pattern");
    expect(sql).toContain('JOIN filtered_activity_reports fa ON fa.id = arg."activityReportId"');
    expect(sql).toContain('JOIN filtered_activity_reports fa ON fa.id = aro."activityReportId"');
    expect(sql).toContain('JOIN filtered_activity_reports fa ON fa.id = ns."activityReportId"');
    expect(sql).not.toMatch(/COALESCE\([^)]+, ''\) ~\* value::text/);
  });

  it('joins multiple report_text_filter terms into a single ordered LIKE search pattern', () => {
    expect(sql).toMatch(
      /'%'\s+\|\|\s+LOWER\(STRING_AGG\(value, ',' ORDER BY position\)\)\s+\|\|\s+'%'/
    );
    expect(sql).toContain('WITH ORDINALITY AS terms(value, position)');
  });

  it('uses matching array types in the shared reportText/topic filter block', () => {
    expect(sql).toMatch(
      /COALESCE\(a\."topics", ARRAY\[\]::TEXT\[\]\) && ARRAY\(\s+SELECT value::varchar/
    );
  });

  it('applies topic.not to the combined report-topic and objective-topic match block', () => {
    expect(sql).toContain('COALESCE(a."topics", ARRAY[]::TEXT[]) && ARRAY(');
    expect(sql).toContain('OR EXISTS (');
    expect(sql).toContain("AND COALESCE(topic_filter, '[]')::jsonb @> to_jsonb(t.name)");
    expect(sql).toContain(') != topic_not_filter');
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

  it('normalizes and applies TTA type filtering with AR-style case-insensitive matching', () => {
    expect(sql).toContain('tta_type_filter_normalized TEXT := NULL;');
    expect(sql).toContain(
      "WHERE value::text IN ('technical-assistance', 'training', 'training,technical-assistance')"
    );
    expect(sql).toContain("string_agg(v.value, ',' ORDER BY v.first_position)");
    expect(sql).toContain(
      "COALESCE(ARRAY_TO_STRING(a.\"ttaType\", ','), '') ILIKE tta_type_filter_normalized"
    );
  });

  it('normalizes TTA type filters by preserving first-seen ordering for allowed values', () => {
    expect(sql).toContain('WITH ORDINALITY AS t(value, ordinality)');
    expect(sql).toContain('MIN(ordinality) AS first_position');
    expect(sql).toContain(
      "WHERE value::text IN ('technical-assistance', 'training', 'training,technical-assistance')"
    );
    expect(sql).toContain("string_agg(v.value, ',' ORDER BY v.first_position)");
  });

  it('seeds filtered_activity_reports without requiring goal links', () => {
    const seedStep = sql.match(/seed_filtered_activity_reports AS \([\s\S]*?RETURNING/);

    expect(seedStep?.[0]).toContain('LEFT JOIN "ActivityRecipients" ar');
    expect(seedStep?.[0]).toContain('LEFT JOIN filtered_grants fgr');
    expect(seedStep?.[0]).not.toContain('JOIN "ActivityReportGoals" arg');
    expect(seedStep?.[0]).not.toContain('JOIN filtered_goals fg');
    expect(seedStep?.[0]).toContain('fgr.id IS NOT NULL');
    expect(seedStep?.[0]).toContain('FROM "ActivityRecipients" ar_scope');
    expect(seedStep?.[0]).toContain('JOIN "Grants" gr_scope');
    expect(seedStep?.[0]).toContain('to_jsonb(a."regionId")::jsonb');
    expect(seedStep?.[0]).toContain('goal_name_filter IS NULL');
    expect(seedStep?.[0]).not.toContain('current_user_id_filter IS NULL');
  });

  it('only applies current-user grant filtering when a group filter is active', () => {
    expect(sql).toMatch(/IF\s+group_filter IS NOT NULL\s+THEN[\s\S]*?GroupCollaborators/);
    expect(sql).not.toMatch(
      /IF\s+group_filter IS NOT NULL OR\s+current_user_id_filter IS NOT NULL\s+THEN/
    );
  });

  it('does not require recipient or program rows for unrelated grant filters', () => {
    const grantFilterStep = sql.match(/-- Step 1\.2:[\s\S]*?-- Step 1\.3:/);

    expect(grantFilterStep?.[0]).not.toContain('JOIN "Recipients" r');
    expect(grantFilterStep?.[0]).not.toContain('JOIN "Programs" p');
    expect(grantFilterStep?.[0]).toContain('FROM "Recipients" r');
    expect(grantFilterStep?.[0]).toContain('FROM "Programs" p');
  });

  it('applies state filtering to grants and the seeded report set', () => {
    expect(sql).toContain('state_code_filter IS NULL');
    expect(sql).toContain('COALESCE(state_code_filter, \'[]\')::jsonb @> to_jsonb(gr."stateCode")');
    expect(sql).toContain('AND state_code_filter IS NULL');
  });
});
