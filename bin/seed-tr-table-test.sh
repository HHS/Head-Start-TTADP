#!/bin/bash

# Script to seed Training Report table test data
# Creates 3 training reports with ~20 sessions total for testing the TR table

set -e  # Exit on error

# run the load-test-db.sh script to ensure the database is ready
sh ./bin/load-test-db

export $(grep POSTGRES_PASSWORD   ./.env)
export PGPASSWORD=${POSTGRES_PASSWORD}

# Get database connection info from environment or use defaults
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-ttasmarthub}
DB_USER=${POSTGRES_USERNAME:-postgres}

echo "Seeding Training Report table test data..."
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Execute SQL commands
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'

-- ========================================
-- PERMISSIONS SETUP
-- ========================================

-- READ_WRITE_TRAINING_REPORTS (scopeId 7)
INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
VALUES
  (1, 14, 7, NOW(), NOW()),
  (3, 14, 7, NOW(), NOW()),
  (5, 14, 7, NOW(), NOW())
ON CONFLICT ("userId", "regionId", "scopeId") DO NOTHING;

-- READ_REPORTS (scopeId 1)
INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
VALUES
  (1, 14, 1, NOW(), NOW()),
  (3, 14, 1, NOW(), NOW()),
  (5, 14, 1, NOW(), NOW())
ON CONFLICT ("userId", "regionId", "scopeId") DO NOTHING;

-- ========================================
-- TRAINING REPORT 1: Re-building and Re-energizing
-- 7 sessions
-- ========================================

INSERT INTO "EventReportPilots" (
  "ownerId",
  "collaboratorIds",
  "regionId",
  "data",
  "pocIds",
  "createdAt",
  "updatedAt"
) VALUES (
  5,
  ARRAY[3]::INTEGER[],
  14,
  jsonb_build_object(
    'eventId', 'R14-TR-23-1037',
    'eventName', 'Re-building and Re-energizing the Workforce',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', '09/27/2023',
    'endDate', '02/28/2024'
  ),
  ARRAY[]::INTEGER[],
  NOW(),
  NOW()
);

-- Sessions for TR 1
INSERT INTO "SessionReportPilots" ("eventId", "data", "createdAt", "updatedAt")
SELECT
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R14-TR-23-1037'),
  jsonb_build_object(
    'sessionName', session_name,
    'status', 'Complete',
    'startDate', start_date,
    'endDate', end_date,
    'objectiveTopics', topics,
    'pocComplete', true,
    'collabComplete', true
  ),
  NOW(),
  NOW()
FROM (VALUES
  ('Executing a team building workshop', '09/27/2023', '02/28/2024', ARRAY['Coaching']::text[]),
  ('Leadership Development Strategies', '10/15/2023', '10/16/2023', ARRAY['Leadership', 'Management']::text[]),
  ('Staff Retention Best Practices', '11/01/2023', '11/02/2023', ARRAY['Human Resources', 'Retention']::text[]),
  ('Building Resilient Teams', '11/20/2023', '11/21/2023', ARRAY['Team Building', 'Resilience']::text[]),
  ('Effective Communication Workshop', '12/05/2023', '12/06/2023', ARRAY['Communication']::text[]),
  ('Conflict Resolution Training', '01/10/2024', '01/11/2024', ARRAY['Conflict Resolution']::text[]),
  ('Performance Management Essentials', '02/15/2024', '02/16/2024', ARRAY['Performance', 'Management']::text[])
) AS t(session_name, start_date, end_date, topics);

-- Link goal templates to sessions for TR 1 (use existing GoalTemplate IDs 1-20)
-- Each session gets 1-3 random goal templates
INSERT INTO "SessionReportPilotGoalTemplates" ("sessionReportPilotId", "goalTemplateId", "createdAt", "updatedAt")
SELECT s.id, gt.id, NOW(), NOW()
FROM "SessionReportPilots" s
CROSS JOIN LATERAL (
  SELECT id FROM "GoalTemplates" WHERE id <= 20 ORDER BY RANDOM() LIMIT (1 + (RANDOM() * 2)::int)
) gt
WHERE s."eventId" = (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R14-TR-23-1037')
ON CONFLICT DO NOTHING;

-- ========================================
-- TRAINING REPORT 2: New England Head Start
-- 7 sessions
-- ========================================

INSERT INTO "EventReportPilots" (
  "ownerId",
  "collaboratorIds",
  "regionId",
  "data",
  "pocIds",
  "createdAt",
  "updatedAt"
) VALUES (
  5,
  ARRAY[3]::INTEGER[],
  14,
  jsonb_build_object(
    'eventId', 'R14-TR-23-0049',
    'eventName', 'New England Head Start Education Conference',
    'eventOrganizer', 'Regional PD Event (with National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', '09/01/2023',
    'endDate', '06/28/2024'
  ),
  ARRAY[]::INTEGER[],
  NOW(),
  NOW()
);

-- Sessions for TR 2
INSERT INTO "SessionReportPilots" ("eventId", "data", "createdAt", "updatedAt")
SELECT
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R14-TR-23-0049'),
  jsonb_build_object(
    'sessionName', session_name,
    'status', 'Complete',
    'startDate', start_date,
    'endDate', end_date,
    'objectiveTopics', topics,
    'pocComplete', true,
    'collabComplete', true
  ),
  NOW(),
  NOW()
FROM (VALUES
  ('Classroom Methods for Success', '09/01/2023', '06/28/2024', ARRAY['CLASS: Classroom']::text[]),
  ('Early Literacy Foundations', '09/15/2023', '09/16/2023', ARRAY['Literacy', 'Early Learning']::text[]),
  ('Math Concepts for Preschoolers', '10/01/2023', '10/02/2023', ARRAY['Mathematics', 'Early Learning']::text[]),
  ('Social-Emotional Development', '10/20/2023', '10/21/2023', ARRAY['Social-Emotional', 'Development']::text[]),
  ('Inclusive Classroom Practices', '11/05/2023', '11/06/2023', ARRAY['Inclusion', 'Disabilities']::text[]),
  ('Parent Engagement Strategies', '12/01/2023', '12/02/2023', ARRAY['Parent Engagement', 'Family']::text[]),
  ('Assessment and Documentation', '01/15/2024', '01/16/2024', ARRAY['Assessment', 'Documentation']::text[])
) AS t(session_name, start_date, end_date, topics);

-- Link goal templates to sessions for TR 2 (use existing GoalTemplate IDs 1-20)
INSERT INTO "SessionReportPilotGoalTemplates" ("sessionReportPilotId", "goalTemplateId", "createdAt", "updatedAt")
SELECT s.id, gt.id, NOW(), NOW()
FROM "SessionReportPilots" s
CROSS JOIN LATERAL (
  SELECT id FROM "GoalTemplates" WHERE id <= 20 ORDER BY RANDOM() LIMIT (1 + (RANDOM() * 2)::int)
) gt
WHERE s."eventId" = (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R14-TR-23-0049')
ON CONFLICT DO NOTHING;

-- ========================================
-- TRAINING REPORT 3: Health and Wellness Series
-- 6 sessions
-- ========================================

INSERT INTO "EventReportPilots" (
  "ownerId",
  "collaboratorIds",
  "regionId",
  "data",
  "pocIds",
  "createdAt",
  "updatedAt"
) VALUES (
  5,
  ARRAY[3]::INTEGER[],
  14,
  jsonb_build_object(
    'eventId', 'R14-TR-23-0046',
    'eventName', 'Health Webinar Series: Oral Health Focus',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'Complete',
    'eventSubmitted', true,
    'startDate', '02/09/2024',
    'endDate', '02/24/2024'
  ),
  ARRAY[]::INTEGER[],
  NOW(),
  NOW()
);

-- Sessions for TR 3
INSERT INTO "SessionReportPilots" ("eventId", "data", "createdAt", "updatedAt")
SELECT
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R14-TR-23-0046'),
  jsonb_build_object(
    'sessionName', session_name,
    'status', 'Complete',
    'startDate', start_date,
    'endDate', end_date,
    'objectiveTopics', topics,
    'pocComplete', true,
    'collabComplete', true
  ),
  NOW(),
  NOW()
FROM (VALUES
  ('Dental check up - Flossing', '02/09/2024', '02/10/2024', ARRAY['Oral Health']::text[]),
  ('Teaching Dental Habits', '02/24/2024', '02/24/2024', ARRAY['Oral Health']::text[]),
  ('Nutrition and Oral Health', '02/11/2024', '02/11/2024', ARRAY['Nutrition', 'Oral Health']::text[]),
  ('Cavity Prevention Strategies', '02/13/2024', '02/13/2024', ARRAY['Oral Health', 'Prevention']::text[]),
  ('Family Dental Care Education', '02/18/2024', '02/18/2024', ARRAY['Oral Health', 'Family Engagement']::text[]),
  ('Community Dental Resources', '02/22/2024', '02/22/2024', ARRAY['Oral Health', 'Community Resources']::text[])
) AS t(session_name, start_date, end_date, topics);

-- Link goal templates to sessions for TR 3 (use existing GoalTemplate IDs 1-20)
INSERT INTO "SessionReportPilotGoalTemplates" ("sessionReportPilotId", "goalTemplateId", "createdAt", "updatedAt")
SELECT s.id, gt.id, NOW(), NOW()
FROM "SessionReportPilots" s
CROSS JOIN LATERAL (
  SELECT id FROM "GoalTemplates" WHERE id <= 20 ORDER BY RANDOM() LIMIT (1 + (RANDOM() * 2)::int)
) gt
WHERE s."eventId" = (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R14-TR-23-0046')
ON CONFLICT DO NOTHING;

-- ========================================
-- SUMMARY
-- ========================================

SELECT 'Training Reports created:' as info, COUNT(*) as count FROM "EventReportPilots" WHERE "data"->>'eventId' LIKE 'R14-TR-23-%';
SELECT 'Sessions created:' as info, COUNT(*) as count FROM "SessionReportPilots" WHERE "eventId" IN (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' LIKE 'R14-TR-23-%');

SQL

echo "✓ Training Report table test data seeded successfully!"
echo "  - 3 Training Reports"
echo "  - 20 Sessions total"
echo "  - Goal templates linked to sessions"
