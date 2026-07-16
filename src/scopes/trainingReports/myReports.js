import { Op } from 'sequelize';

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
 * Built from native Sequelize operators (no raw SQL) so the user id is bound as a
 * parameter rather than interpolated. The include case ORs the positive clauses;
 * the exclude case ANDs their negations (De Morgan). `collaboratorIds` is NOT NULL
 * so its negation needs no null branch; `pocIds` is nullable, so exclude adds a
 * `pocIds IS NULL` branch to keep rows that would otherwise drop via NULL logic.
 */
export function trMyReportsScopes(userId, roles, exclude) {
  const roleList = roles || [];

  // Independently validate the user id as an integer before using it in a query
  // (per AGENTS.md "SQL injection in filters" guidance).
  const uid = Number(userId);
  const validUserId = Number.isInteger(uid) ? uid : null;

  // Filter active but no usable clauses (invalid user id):
  // include -> match nothing; exclude -> match everything.
  if (validUserId === null) {
    return exclude ? {} : { id: { [Op.eq]: null } };
  }

  const positiveClauses = [];
  const negativeClauses = [];

  if (roleList.includes('TR event creator')) {
    positiveClauses.push({ ownerId: uid });
    negativeClauses.push({ ownerId: { [Op.ne]: uid } });
  }

  if (roleList.includes('TR event collaborator')) {
    // collaboratorIds is NOT NULL, so no null branch is needed. Sequelize has no
    // "not contains" array operator, so negate the containment with Op.not.
    positiveClauses.push({ collaboratorIds: { [Op.contains]: [uid] } });
    negativeClauses.push({ [Op.not]: { collaboratorIds: { [Op.contains]: [uid] } } });
  }

  if (roleList.includes('TR POC')) {
    // pocIds is nullable; keep NULL rows in the exclude case (a NULL array can't
    // contain the user, so they are "not the POC").
    positiveClauses.push({ pocIds: { [Op.contains]: [uid] } });
    negativeClauses.push({
      [Op.or]: [
        { [Op.not]: { pocIds: { [Op.contains]: [uid] } } },
        { pocIds: { [Op.is]: null } },
      ],
    });
  }

  // Filter active but no TR role selected:
  // include -> match nothing; exclude -> match everything.
  if (positiveClauses.length === 0) {
    return exclude ? {} : { id: { [Op.eq]: null } };
  }

  return exclude ? { [Op.and]: negativeClauses } : { [Op.or]: positiveClauses };
}

export function withTrMyReports(roles, _options, userId) {
  return trMyReportsScopes(userId, roles, false);
}

export function withoutTrMyReports(roles, _options, userId) {
  return trMyReportsScopes(userId, roles, true);
}
