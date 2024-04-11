import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { idClause } from '../utils';

const constructLiteral = (query: string[], userId: number): string => {
  const where = idClause(query);
  return sequelize.literal(`(
      SELECT DISTINCT g."id" 
      FROM "Goals" g
      JOIN "Grants" gr
      ON g."grantId" = gr.id
      JOIN "GroupGrants" gg
      ON gr.id = gg."grantId"
      JOIN "Groups" grp
      ON gg."groupId" = grp.id
      JOIN "GroupCollaborators" gc
      ON grp."id" = gc."groupId"
      WHERE grp."id" IN (${where})
      AND (gc."userId" = ${userId} OR grp."isPublic" = true)     
  )`);
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
