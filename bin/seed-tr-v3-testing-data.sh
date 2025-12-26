#!/bin/bash

# Script to seed Training Report V3 testing data
# This script is intended to test TR Alerts

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

echo "Seeding Training Report V3 testing data..."
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Execute SQL commands
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'

-- ========================================
-- PERMISSIONS SETUP
-- ========================================


-- READ_WRITE_TRAINING_REPORTS
INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
VALUES
  (1, 3, 7, NOW(), NOW()),  -- Hermoine Granger - Admin
  (3, 3, 7, NOW(), NOW()),  -- Harry Potter
  (5, 3, 7, NOW(), NOW()),  -- Cucumber User - Creator/Owner
  (4, 3, 7, NOW(), NOW())   -- Ron Weasley - Collaborator
ON CONFLICT ("userId", "regionId", "scopeId") DO NOTHING;

-- POC_TRAINING_REPORTS
INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
VALUES
  (6, 3, 8, NOW(), NOW())   -- Larry Botter - POC
ON CONFLICT ("userId", "regionId", "scopeId") DO NOTHING;

-- READ_REPORTS = 1
INSERT INTO "Permissions" ("userId", "regionId", "scopeId", "createdAt", "updatedAt")
VALUES
  (5, 3, 1, NOW(), NOW()),  -- Cucumber User - Creator/Owner
  (4, 3, 1, NOW(), NOW())   -- Ron Weasley - Collaborator
ON CONFLICT ("userId", "regionId", "scopeId") DO NOTHING;


-- ========================================
-- Claude: insert SQL BELOW
-- ========================================

-- ========================================
-- ALERT TEST DATA
-- ========================================
-- This section creates minimal test data to validate all 6 Training Report V3 alert types:
-- 1. missingEventInfo: Event not submitted 20 days past END date
-- 2. noSessionsCreated: No sessions 20 days past START date
-- 3. eventNotCompleted: Event incomplete 20 days past END date (all sessions complete)
-- 4. missingSessionInfo: Session incomplete 20 days past START date (collab or POC section)
-- 5. waitingForApproval: Session submitted awaiting approver review
-- 6. changesNeeded: Approver returned session for edits

-- ========================================
-- ALERT 1: Missing Event Info
-- ========================================
-- Event not submitted 20 days after event END date
-- Who sees: Owner (User 5), Collaborators (User 3)

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
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-001',
    'eventName', 'Alert Test: Missing Event Info',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', false,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE - INTERVAL '21 days', 'MM/DD/YYYY')
  ),
  ARRAY[6]::INTEGER[],
  NOW(),
  NOW()
);

-- ========================================
-- ALERT 2: No Sessions Created
-- ========================================
-- No sessions created 20 days after event START date
-- Who sees: Owner (User 5), Collaborators (User 3)

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
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-002',
    'eventName', 'Alert Test: No Sessions Created',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '21 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '10 days', 'MM/DD/YYYY')
  ),
  ARRAY[6]::INTEGER[],
  NOW(),
  NOW()
);
-- Note: No sessions will be created for this event to trigger the alert

-- ========================================
-- ALERT 3: Event Not Completed
-- ========================================
-- Event not completed 20 days past END date, with all sessions complete
-- Who sees: Owner (User 5) ONLY

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
  ARRAY[]::INTEGER[],
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-003',
    'eventName', 'Alert Test: Event Not Completed',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE - INTERVAL '21 days', 'MM/DD/YYYY')
  ),
  ARRAY[]::INTEGER[],
  NOW(),
  NOW()
);

-- Create a complete session for this event (triggers eventNotCompleted alert)
INSERT INTO "SessionReportPilots" (
  "eventId",
  "approverId",
  "data",
  "createdAt",
  "updatedAt"
) VALUES (
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R03-ALERT-003'),
  7,
  jsonb_build_object(
    'sessionName', 'Complete Session',
    'status', 'Complete',
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '25 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE - INTERVAL '24 days', 'MM/DD/YYYY'),
    'pocComplete', true,
    'collabComplete', true
  ),
  NOW(),
  NOW()
);

-- ========================================
-- ALERT 4a: Missing Session Info - Collaborator Section
-- ========================================
-- Session not submitted 20 days past session START date (collabComplete = false)
-- Who sees: Owner (User 5), Collaborators (User 3)

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
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-004',
    'eventName', 'Alert Test: Missing Session Info - Collab',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '10 days', 'MM/DD/YYYY')
  ),
  ARRAY[6]::INTEGER[],
  NOW(),
  NOW()
);

INSERT INTO "SessionReportPilots" (
  "eventId",
  "data",
  "createdAt",
  "updatedAt"
) VALUES (
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R03-ALERT-004'),
  jsonb_build_object(
    'sessionName', 'Missing Collab Info',
    'status', 'In progress',
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '21 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '5 days', 'MM/DD/YYYY'),
    'pocComplete', true,
    'collabComplete', false
  ),
  NOW(),
  NOW()
);

-- ========================================
-- ALERT 4b: Missing Session Info - POC Section
-- ========================================
-- Session not submitted 20 days past session START date (pocComplete = false)
-- Who sees: POCs (User 6)

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
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-005',
    'eventName', 'Alert Test: Missing Session Info - POC',
    'eventOrganizer', 'Regional PD Event (with National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '10 days', 'MM/DD/YYYY')
  ),
  ARRAY[6]::INTEGER[],
  NOW(),
  NOW()
);

INSERT INTO "SessionReportPilots" (
  "eventId",
  "data",
  "createdAt",
  "updatedAt"
) VALUES (
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R03-ALERT-005'),
  jsonb_build_object(
    'sessionName', 'Missing POC Info',
    'status', 'In progress',
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '21 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '5 days', 'MM/DD/YYYY'),
    'pocComplete', false,
    'collabComplete', true
  ),
  NOW(),
  NOW()
);

-- ========================================
-- ALERT 5: Waiting for Approval
-- ========================================
-- Session submitted and waiting for approver review
-- Who sees: Submitter (User 3), Approver (User 7)

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
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-006',
    'eventName', 'Alert Test: Waiting for Approval',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '10 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '10 days', 'MM/DD/YYYY')
  ),
  ARRAY[6]::INTEGER[],
  NOW(),
  NOW()
);

INSERT INTO "SessionReportPilots" (
  "eventId",
  "approverId",
  "data",
  "createdAt",
  "updatedAt"
) VALUES (
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R03-ALERT-006'),
  7,
  jsonb_build_object(
    'sessionName', 'Waiting Approval',
    'status', 'In progress',
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '5 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '5 days', 'MM/DD/YYYY'),
    'pocComplete', true,
    'collabComplete', true,
    'submitterId', 3
  ),
  NOW(),
  NOW()
);

-- ========================================
-- ALERT 6: Changes Needed
-- ========================================
-- Approver returned session for edits
-- Who sees: Submitter (User 3) ONLY

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
  3,
  jsonb_build_object(
    'eventId', 'R03-ALERT-007',
    'eventName', 'Alert Test: Changes Needed',
    'eventOrganizer', 'Regional TTA Hosted Event (no National Centers)',
    'status', 'In progress',
    'eventSubmitted', true,
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '10 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '10 days', 'MM/DD/YYYY')
  ),
  ARRAY[6]::INTEGER[],
  NOW(),
  NOW()
);

INSERT INTO "SessionReportPilots" (
  "eventId",
  "approverId",
  "data",
  "createdAt",
  "updatedAt"
) VALUES (
  (SELECT id FROM "EventReportPilots" WHERE "data"->>'eventId' = 'R03-ALERT-007'),
  7,
  jsonb_build_object(
    'sessionName', 'Changes Needed',
    'status', 'in-progress-needs-action',
    'startDate', TO_CHAR(CURRENT_DATE - INTERVAL '5 days', 'MM/DD/YYYY'),
    'endDate', TO_CHAR(CURRENT_DATE + INTERVAL '5 days', 'MM/DD/YYYY'),
    'pocComplete', true,
    'collabComplete', true,
    'submitterId', 3
  ),
  NOW(),
  NOW()
);

SQL

echo "✓ Training Report V3 testing data seeded successfully!"
