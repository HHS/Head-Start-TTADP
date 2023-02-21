import { Query } from 'pg';
import through2 from 'through2';

import {
  sequelize,
} from '../models';

const arrayFields = [
  'Roles',
  'READ_WRITE_REPORTS regions',
  'READ_REPORTS regions',
  'APPROVE_REPORTS regions',
  'UNLOCK_APPROVED_REPORTS regions',
  'Flags',
];

/**
 * Transform function to convert the data to the right format.
 *
 * @param {*} user - a user row
 */
function convertToCSV(user) {
  // Surround array fields with double quotes
  const mappedUser = {};
  Object.keys(user)
    .forEach((k) => { mappedUser[k] = (arrayFields.includes(k) && user[k] ? `"${user[k]}"` : user[k]); });

  const result = Object.values(mappedUser).toString();

  return `${result}\n`;
}

/**
 * Transform function to convert the data to the right format.
 *
 * @param {*} sql - raw sql
 * @param {*} transform - a function to transform a row of data
 * @returns {*} - a new stream
 */
const streamable = async (sql, transform) => {
  const conn = await sequelize.connectionManager.getConnection();
  const stream = through2.obj();
  const query = conn.query(new Query(sql));

  let writeHeader = true;

  const end = async () => {
    await sequelize.connectionManager.releaseConnection(conn);
    stream.end();
  };
  query.on('row', (r) => {
    if (writeHeader) {
      writeHeader = false;
      const header = Object.keys(r).toString();
      stream.push(`${header}\n`);
    }
    stream.push(transform ? transform(r) : r);
  });
  query.once('error', (err) => {
    stream.emit('error', err);
    end();
  });
  query.once('end', end);

  return stream;
};

/**
 * Retrieves users that have permissions.
 * Inspired by https://github.com/sequelize/sequelize/issues/2454
 *
 * @param {*} sql - raw sql
 * @param {*} transform - a function to transform a row of data
 * @returns {Promise<Object>} - an Active Users stream
 */
export default async function activeUsers() {
  const sql = `WITH "ActiveUsers" AS (
      SELECT
          "User"."id" AS "id",
          "User"."name" AS "name",
          "User"."email" AS "email",
          "User"."homeRegionId" AS "homeRegionId",
          "User"."lastLogin" AS "lastLogin",
          "User"."flags" AS "flags",
          "roles"."roleId" AS "roleId",
          "Role".name AS "roles",
          "permissions"."scopeId" AS "scopeId",
          "Scope"."name" AS "scope",
          "permissions"."regionId" AS "regionId"
      FROM
          "Users" AS "User"
          INNER JOIN "Permissions" AS "permissions" ON "User"."id" = "permissions"."userId"
          LEFT JOIN "UserRoles" "roles" ON "roles"."userId" = "User"."id"
          LEFT JOIN "Roles" "Role" ON "roles"."roleId" = "Role"."id"
          LEFT JOIN "Scopes" "Scope" ON "Scope"."id" = "permissions"."scopeId"
  )
  SELECT
      "ActiveUsers"."name" AS "Name",
      "ActiveUsers"."email" AS "Email",
      "ActiveUsers"."homeRegionId" AS "Region",
      string_agg(DISTINCT "ActiveUsers"."roles" :: VARCHAR, ',') AS "Roles",
      "ActiveUsers"."lastLogin" AS "Last login",
      MIN(CASE WHEN "ActiveUsers"."scope" = 'SITE_ACCESS' THEN "ActiveUsers"."scope" END) AS "SITE_ACCESS",
      MIN(CASE WHEN "ActiveUsers"."scope" = 'ADMIN' THEN "ActiveUsers"."scope" END) AS "ADMIN",
      MIN(CASE WHEN "ActiveUsers"."scope" = 'UNLOCK_APPROVED_REPORTS' THEN "ActiveUsers"."scope" END) AS "UNLOCK_APPROVED_REPORTS",
      MIN(CASE WHEN "ActiveUsers"."scope" = 'READ_WRITE_REPORTS' THEN "ActiveUsers"."scope" END) AS "READ_WRITE_REPORTS",
      array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'READ_WRITE_REPORTS') AS "READ_WRITE_REPORTS regions",
      MIN(CASE WHEN "ActiveUsers"."scope" = 'READ_REPORTS' THEN "ActiveUsers"."scope" END) AS "READ_REPORTS",
      array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'READ_REPORTS') AS "READ_REPORTS regions",
      MIN(CASE WHEN "ActiveUsers"."scope" = 'APPROVE_REPORTS' THEN "ActiveUsers"."scope" END) AS "APPROVE_REPORTS",
      array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'APPROVE_REPORTS') AS "APPROVE_REPORTS regions",
      "ActiveUsers"."flags" AS "Flags"
  FROM
      "ActiveUsers"
  GROUP BY
      "ActiveUsers"."name",
      "ActiveUsers"."email",
      "ActiveUsers"."homeRegionId",
      "ActiveUsers"."lastLogin",
      "ActiveUsers"."flags";
      `;
  const src = streamable(sql, convertToCSV);
  return src;
}
