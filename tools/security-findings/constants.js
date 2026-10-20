const DEFAULT_SCAN_TYPES_PATH = 'security/findings/scan-types.json';
const DEFAULT_REGISTER_PATH = 'security/findings/register.json';
const DEFAULT_SAST_BASELINE_PATH = 'security/sast/baseline.json';
const DEFAULT_SAST_DISPOSITIONS_PATH = 'security/sast/dispositions.json';
const DEFAULT_BACKEND_AUDIT_PATH = 'yarn-audit-known-issues';
const DEFAULT_FRONTEND_AUDIT_PATH = 'frontend/yarn-audit-known-issues';
const DEFAULT_BACKEND_BASELINE_PATH = 'security/dependencies/backend-baseline.json';
const DEFAULT_FRONTEND_BASELINE_PATH = 'security/dependencies/frontend-baseline.json';
const DEFAULT_PENDING_OBSERVATIONS_PATH = 'security/dependencies/pending-observations.json';

const VALID_REGISTER_SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const VALID_SCAN_TYPES = new Set(['sast', 'sca', 'dast']);
const VALID_DISPOSITIONS = new Set(['resolved', 'accepted', 'deferred']);
const VALID_ACCEPTANCE_TYPES = new Set(['risk_accepted', 'false_positive', 'not_applicable']);
const VALID_PENDING_ESCALATION_STATES = new Set(['warning', 'escalated', 'resolved']);
const OPERATIONAL_TIME_ZONE = 'America/New_York';
const DUE_DATE_WARNING_DAYS = 14;
const DUE_DATE_GRACE_DAYS = 7;
const JIRA_TICKET_PATTERN = /^TTAHUB-[1-9]\d*$/;

module.exports = {
  DEFAULT_BACKEND_AUDIT_PATH,
  DEFAULT_BACKEND_BASELINE_PATH,
  DEFAULT_FRONTEND_AUDIT_PATH,
  DEFAULT_FRONTEND_BASELINE_PATH,
  DEFAULT_PENDING_OBSERVATIONS_PATH,
  DEFAULT_REGISTER_PATH,
  DEFAULT_SAST_BASELINE_PATH,
  DEFAULT_SAST_DISPOSITIONS_PATH,
  DEFAULT_SCAN_TYPES_PATH,
  DUE_DATE_GRACE_DAYS,
  DUE_DATE_WARNING_DAYS,
  JIRA_TICKET_PATTERN,
  OPERATIONAL_TIME_ZONE,
  VALID_ACCEPTANCE_TYPES,
  VALID_DISPOSITIONS,
  VALID_PENDING_ESCALATION_STATES,
  VALID_REGISTER_SEVERITIES,
  VALID_SCAN_TYPES,
};
