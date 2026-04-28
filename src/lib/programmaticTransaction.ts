import { QueryTypes, Op } from 'sequelize';
import db, { sequelize } from '../models';
import { auditLogger } from '../logger';

// Define the structure for maximum ID records
interface MaxIdRecord {
  table_name: string;
  max_id: number;
}

// Fetch the maximum IDs from the audit tables
// Parameters:
// - includeDDL (boolean): If true, includes tables with Data Definition Language (DDL) logs
// (e.g., schema changes).  DDL refers to commands used to create, alter, and delete database
// objects, such as CREATE TABLE, ALTER TABLE, etc.
const fetchMaxIds = async (
  includeDDL = false,
): Promise<MaxIdRecord[]> => sequelize.query<MaxIdRecord>(
  // Use a different SQL query depending on whether to include DDL tables or not
  includeDDL
    ? /* sql */ `
      SELECT
          cls.relname AS table_name, -- The name of the table in the database
          -- The highest ID value in the sequence, or 0 if no value
          COALESCE(seq_data.last_value, 0) AS max_id
      FROM pg_class seq
      -- Join to capture dependency relationships between sequences and tables
      JOIN pg_depend dep ON dep.objid = seq.oid
      JOIN pg_class cls ON cls.oid = dep.refobjid
      -- Match sequences with the table's ID column
      JOIN pg_attribute attr ON attr.attrelid = dep.refobjid AND attr.attnum = dep.refobjsubid
      -- Retrieve the sequence data for the current sequences
      JOIN pg_sequences seq_data ON seq_data.sequencename = seq.relname
      WHERE seq.relkind = 'S' -- Limit to sequence objects ('S' indicates sequences)
      AND cls.relname LIKE 'ZAL%' -- Limit to audit tables (tables starting with 'ZAL')
      AND attr.attname = 'id' -- Ensure the sequence is linked to the 'id' column in the table
      AND seq_data.schemaname = 'public'; -- Only consider sequences in the 'public' schema
    `
    : /* sql */ `
      SELECT
          cls.relname AS table_name, -- The name of the table in the database
          -- The highest ID value in the sequence, or 0 if no value
          COALESCE(seq_data.last_value, 0) AS max_id
      FROM pg_class seq
      -- Join to capture dependency relationships between sequences and tables
      JOIN pg_depend dep ON dep.objid = seq.oid
      JOIN pg_class cls ON cls.oid = dep.refobjid
      -- Match sequences with the table's ID column
      JOIN pg_attribute attr ON attr.attrelid = dep.refobjid AND attr.attnum = dep.refobjsubid
      -- Retrieve the sequence data for the current sequences
      JOIN pg_sequences seq_data ON seq_data.sequencename = seq.relname
      WHERE seq.relkind = 'S' -- Limit to sequence objects ('S' indicates sequences)
      AND cls.relname LIKE 'ZAL%' -- Limit to audit tables (tables starting with 'ZAL')
      -- Exclude the DDL audit table ('ZALDDL' is used for schema change logs)
      AND cls.relname != 'ZALDDL'
      AND attr.attname = 'id' -- Ensure the sequence is linked to the 'id' column in the table
      AND seq_data.schemaname = 'public'; -- Only consider sequences in the 'public' schema
    `,
  { type: QueryTypes.SELECT }, // Use SELECT query type for fetching results
);

interface ChangeRecord {
  source_table: string;
  dml_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_row_data: { [key: string]: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_row_data: { [key: string]: any };
  dml_timestamp: string;
  data_id: number;
}

// Fetch and aggregate changes from all audit tables based on fetched max IDs
const fetchAndAggregateChanges = async (maxIds: MaxIdRecord[]): Promise<ChangeRecord[]> => {
  const allChanges: ChangeRecord[] = (await Promise.all(maxIds.flatMap(async ({
    table_name,
    max_id,
  }) => sequelize.query<ChangeRecord>(/* sql */ `
    SELECT *, '${table_name}' AS source_table
    FROM "${table_name}"
    WHERE id > COALESCE(:maxId, 0)
    ORDER BY dml_timestamp DESC
  `, {
    replacements: { maxId: max_id },
    type: QueryTypes.SELECT,
  })))).flat();

  // Sort changes in reverse chronological order to ensure correct order for reversion
  allChanges
    .sort((a, b) => new Date(b.dml_timestamp).getTime() - new Date(a.dml_timestamp).getTime());

  return allChanges;
};

// Returns true when err represents a PostgreSQL FK constraint violation (error code 23503).
// Checks both Sequelize wrapper and the underlying driver error to handle all wrapping styles.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isFKViolation = (err: any): boolean => (
  err?.name === 'SequelizeForeignKeyConstraintError'
  || err?.constructor?.name === 'SequelizeForeignKeyConstraintError'
  || err?.original?.code === '23503'
  || err?.parent?.code === '23503'
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateReplacements = (delta: ChangeRecord): Record<string, any> => (
  Object.entries(delta.old_row_data).reduce(
    (acc, [key, value]) => {
      let parsedValue;
      try {
        // @ts-ignore
        // Argument of type 'unknown' is not assignable to parameter of type 'string'.ts(2345)
        parsedValue = JSON.parse(value);
      } catch (error) {
        parsedValue = value;
      }
      return {
        ...acc,
        [key]: Array.isArray(parsedValue)
          ? `{${parsedValue.map((v) => `"${v}"`).join(',')}}`
          : parsedValue,
      };
    },
    { id: delta.data_id },
  )
);

// Apply a single audit-log reversion. Throws on failure; callers handle FK violations.
const revertChange = async (change: ChangeRecord): Promise<void> => {
  const tableName = change.source_table.replace('ZAL', '');

  switch (change.dml_type) {
    case 'INSERT':
      await sequelize.query(/* sql */ `
        DELETE FROM "${tableName}"
        WHERE id = :id;
      `, { replacements: { id: change.data_id } });
      break;
    case 'DELETE': {
      const columns = Object.keys(change.old_row_data)
        .map((key) => `"${key}"`)
        .join(', ');
      const replacements = generateReplacements(change);
      await sequelize.query(/* sql */ `
        INSERT INTO "${tableName}" (${columns})
        VALUES (${Object.keys(replacements).map((key) => `:${key}`).join(', ')});
      `, { replacements });
      break;
    }
    case 'UPDATE': {
      const setClause = Object.keys(change.old_row_data)
        .map((key) => `"${key}" = :${key}`)
        .join(', ');
      const replacements = generateReplacements(change);
      await sequelize.query(/* sql */ `
        UPDATE "${tableName}"
        SET ${setClause}
        WHERE id = :id;
      `, { replacements });
      break;
    }
    default:
      throw new Error(`Unknown dml_type(${change.dml_type}) for table: ${tableName}`);
  }
};

// Revert all changes based on the aggregated change records.
// FK constraint violations (23503) are deferred and retried so that same-millisecond
// parent/child deletions can be re-inserted in the correct order (parent first).
const revertAllChanges = async (maxIds: MaxIdRecord[]): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    auditLogger.error('Attempt to revert changes in production environment');
    throw new Error('Revert operations are not allowed in production environment');
  }

  let allChanges: ChangeRecord[];
  try {
    allChanges = await fetchAndAggregateChanges(maxIds);
  } catch (err) {
    auditLogger.error('Error during reversion:', err);
    throw err;
  }

  const pending = allChanges;
  let deferred: ChangeRecord[] = [];

  // First pass: process all changes, deferring FK violations for retry.
  for (const change of pending) { // eslint-disable-line no-restricted-syntax
    try {
      await revertChange(change); // eslint-disable-line no-await-in-loop
    } catch (err) {
      if (isFKViolation(err)) {
        deferred.push(change);
      } else {
        auditLogger.error('Error during reversion:', err);
        throw err;
      }
    }
  }

  // Retry deferred FK changes in passes until no more progress can be made.
  // Each pass may resolve FK violations whose parent rows were re-inserted in a prior pass.
  while (deferred.length > 0) {
    const prevCount = deferred.length;
    const currentDeferred = deferred;
    deferred = [];

    for (const change of currentDeferred) { // eslint-disable-line no-restricted-syntax
      try {
        await revertChange(change); // eslint-disable-line no-await-in-loop
      } catch (err) {
        if (isFKViolation(err)) {
          deferred.push(change);
        } else {
          auditLogger.error('Error during reversion:', err);
          throw err;
        }
      }
    }

    if (deferred.length >= prevCount) {
      break; // No progress made; stop to avoid an infinite loop.
    }
  }

  if (deferred.length > 0) {
    auditLogger.error(
      `revertAllChanges: ${deferred.length} change(s) could not be reverted due to persistent FK violations`,
      deferred.map((c) => ({ table: c.source_table, id: c.data_id, type: c.dml_type })),
    );
  } else {
    auditLogger.log('info', 'All changes have been successfully reverted.');
  }
};

const captureSnapshot = async (
  includeDDL = false,
): Promise<MaxIdRecord[]> => fetchMaxIds(includeDDL);
const rollbackToSnapshot = async (maxIds: MaxIdRecord[]): Promise<void> => revertAllChanges(maxIds);

// This method of validating the transaction has not modified data is needed as the following
// command fails on any creation of temp tables:
// `SET TRANSACTION READ ONLY;`
const hasModifiedData = async (snapShot, transactionId) => {
  if (!transactionId) {
    throw new Error('Transaction ID not found');
  }

  const zalTables = Object.keys(db)
    // Filter the keys of the `db` object for tables that start with 'ZAL'
    .filter((key) => key.startsWith('ZAL'))
    // Endpoints Descriptor Are allowed to be added to the audit log
    .filter((key) => key !== 'ZALZADescriptor')
    .sort();

  if (zalTables.length === 0) {
    return false;
  }

  const buildCondition = (table, maxId) => {
    let condition:{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dml_txid?: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ddl_txid?: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      object_identity?: any,
    } = {
      id: { [Op.gt]: Number(maxId) },
      dml_txid: transactionId,
    }; // Default condition for ZAL tables

    if (table === 'ZALDDL') {
      condition = {
        id: { [Op.gt]: Number(maxId) },
        ddl_txid: transactionId,
        object_identity: { [Op.notLike]: 'pg_temp.%' },
      };
    }
    return condition;
  };

  // Create an array of promises for each table
  const queryPromises = zalTables.map((table) => {
    const tableName = db[table]?.getTableName();

    if (!tableName) {
      throw new Error(`Table name not found for model: ${table}`);
    }

    const snapShotEntry = snapShot.find((entry) => entry.table_name === tableName);

    if (!snapShotEntry) {
      throw new Error(`Snapshot entry not found for table: ${tableName}`);
    }

    const condition = buildCondition(table, snapShotEntry.max_id);

    return db[table].findOne({
      where: condition,
      attributes: ['id'], // Only return the `id` column
    });
  });

  // Await all the promises at once
  const results = await Promise.all(queryPromises);

  // Check if any of the results returned a non-null value
  return results.some((result) => result !== null);
};

export {
  MaxIdRecord,
  ChangeRecord,
  fetchMaxIds,
  fetchAndAggregateChanges,
  revertChange,
  revertAllChanges,
  captureSnapshot,
  rollbackToSnapshot,
  hasModifiedData,
};
