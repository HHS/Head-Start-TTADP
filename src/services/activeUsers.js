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
  'READ_WRITE_TRAINING_REPORTS',
  'READ_WRITE_TRAINING_REPORTS regions',
  'POC_TRAINING_REPORTS',
  'POC_TRAINING_REPORTS regions',
  'Flags',
];

/**
 * Transform function to convert the data to the right format.
 *
 * @param {object} user - a user row
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
 * @param {string} sql - raw sql
 * @param {function} transform - a function to transform a row of data
 * @returns {Promise<object>} - a new stream
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
 * @param {string} sql - raw sql
 * @param {function} transform - a function to transform a row of data
 * @returns {Promise<Object>} - an Active Users stream
 */
export default async function activeUsers() {
  const sql = `WITH "ActiveUsers" AS (
    SELECT
        "User"."id" AS "id",
        "User"."name" AS "name",
        "User"."email" AS "email",
        "User"."homeRegionId" AS "homeRegionId",
        to_char("User"."lastLogin" AT TIME ZONE 'EST', 'DD Mon YYYY HH12:MI:SS AM TZ ET') AS "lastLogin",
        date_part('day',now()::timestamp - "lastLogin") as "days",
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
    "ActiveUsers"."days" AS "Days since last login",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'SITE_ACCESS' THEN 'Yes' END) AS "SITE_ACCESS",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'ADMIN' THEN 'Yes' END) AS "ADMIN",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'UNLOCK_APPROVED_REPORTS' THEN 'Yes' END) AS "UNLOCK_APPROVED_REPORTS",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'READ_WRITE_REPORTS' THEN 'Yes' END) AS "READ_WRITE_REPORTS",
    array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'READ_WRITE_REPORTS') AS "READ_WRITE_REPORTS regions",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'READ_REPORTS' THEN 'Yes' END) AS "READ_REPORTS",
    array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'READ_REPORTS') AS "READ_REPORTS regions",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'APPROVE_REPORTS' THEN 'Yes' END) AS "APPROVE_REPORTS",
    array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'APPROVE_REPORTS') AS "APPROVE_REPORTS regions",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'READ_WRITE_TRAINING_REPORTS' THEN 'Yes' END) AS "READ_WRITE_TRAINING_REPORTS",
    array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'READ_WRITE_TRAINING_REPORTS') AS "READ_WRITE_TRAINING_REPORTS regions",
    MIN(CASE WHEN "ActiveUsers"."scope" = 'POC_TRAINING_REPORTS' THEN 'Yes' END) AS "POC_TRAINING_REPORTS",
    array_agg(DISTINCT "ActiveUsers"."regionId") filter (WHERE "ActiveUsers"."scope" = 'POC_TRAINING_REPORTS') AS "POC_TRAINING_REPORTS regions",
    "ActiveUsers"."flags" AS "Flags"
FROM
    "ActiveUsers"
GROUP BY
    "ActiveUsers"."name",
    "ActiveUsers"."email",
    "ActiveUsers"."homeRegionId",
    "ActiveUsers"."lastLogin",
    "ActiveUsers"."days",
    "ActiveUsers"."flags";
      `;
  const src = streamable(sql, convertToCSV);
  return src;
}
