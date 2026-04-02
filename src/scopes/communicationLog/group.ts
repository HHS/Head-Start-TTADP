import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { validatedIdArray } from '../utils';

// WARNING - DO NOT interpolate unvalidated input into this SQL literal.
// Only validated integers allowed.
const constructLiteral = (query: string[], userId: number): string => {
  const expandedQuery = query
    .map((q) => q.split(','))
    .reduce<string[]>((acc, parts) => {
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          acc.push(trimmed);
        }
      }
      return acc;
    }, []);
  const validatedIds = validatedIdArray(expandedQuery);
  const placeholders = validatedIds.length > 0 ? validatedIds.join(',') : '-1';
  const escapedUserId = Number.isInteger(userId) ? userId : -1;

  const sql = `
    (
      SELECT DISTINCT clr."communicationLogId"
      FROM "CommunicationLogRecipients" clr
      JOIN "Recipients" r
        ON clr."recipientId" = r.id
      JOIN "Grants" gr
        ON gr."recipientId" = r.id
      JOIN "GroupGrants" gg
        ON gr.id = gg."grantId"
      JOIN "Groups" g
        ON gg."groupId" = g.id
      LEFT JOIN "GroupCollaborators" gc
        ON g.id = gc."groupId"
      WHERE g.id IN (${placeholders})
      AND (gc."userId" = ${escapedUserId} OR g."isPublic" = true)
    )
  `;

  return sequelize.literal(sql);
};

/**
 *
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withoutGroup
 */
export function withGroup(query: string[], userId: number): WhereOptions {
  return {
    id: {
      [Op.in]: constructLiteral(query, userId),
    },
  };
}

/**
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withGroup
 */
export function withoutGroup(query: string[], userId: number): WhereOptions {
  return {
    id: {
      [Op.notIn]: constructLiteral(query, userId),
    },
  };
}
