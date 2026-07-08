/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Training Report side of the RTR TTA History "My reports" filter.
 *
 * The filter is shared with Activity Reports, so the incoming `roles` array may
 * contain a mix of AR labels (ignored here) and the three TR labels below. Each
 * TR role maps to a column on EventReportPilot:
 *  - 'TR event creator'      -> ownerId
 *  - 'TR event collaborator' -> collaboratorIds (integer array)
 *  - 'TR POC'                -> pocIds (integer array)
 *
 * Semantics mirror the AR scope so the combined filter behaves like a union:
 *  - include ("where I'm the"): TRs where the user holds one of the selected TR
 *    roles. If no TR role is selected, nothing matches.
 *  - exclude ("where I'm not the"): TRs where the user holds none of the selected
 *    TR roles. If no TR role is selected, everything matches (no-op).
 *
 * The result mirrors the AR `myReports` scope shape (`{ [Op.or]: [literal] }`); a
 * `sequelize.literal` boolean expression is used because a bare literal is not
 * accepted directly as a `where` fragment.
 */
export function trMyReportsScopes(userId, roles, exclude) {
  const roleList = roles || [];

  // Independently validate the user id as an integer before interpolating it into
  // the SQL expression below (per AGENTS.md "SQL injection in filters" guidance).
  const uid = Number(userId);
  const validUserId = Number.isInteger(uid) ? uid : null;

  const clauses = [];
  if (validUserId !== null) {
    if (roleList.includes('TR event creator')) {
      clauses.push(`"EventReportPilot"."ownerId" = ${uid}`);
    }
    if (roleList.includes('TR event collaborator')) {
      // COALESCE guards against NULL arrays so exclude (NOT ...) keeps rows whose
      // array is empty/NULL rather than dropping them via NULL logic.
      clauses.push(
        `COALESCE("EventReportPilot"."collaboratorIds" && ARRAY[${uid}]::integer[], false)`
      );
    }
    if (roleList.includes('TR POC')) {
      clauses.push(`COALESCE("EventReportPilot"."pocIds" && ARRAY[${uid}]::integer[], false)`);
    }
  }

  let boolExpr;
  if (clauses.length === 0) {
    // Filter active but no TR role selected (or an invalid user id):
    // include -> match nothing; exclude -> match everything.
    boolExpr = exclude ? 'true' : 'false';
  } else {
    const joined = clauses.join(' OR ');
    boolExpr = exclude ? `NOT (${joined})` : `(${joined})`;
  }

  return { [Op.or]: [sequelize.literal(boolExpr)] };
}

export function withTrMyReports(roles, _options, userId) {
  return trMyReportsScopes(userId, roles, false);
}

export function withoutTrMyReports(roles, _options, userId) {
  return trMyReportsScopes(userId, roles, true);
}
