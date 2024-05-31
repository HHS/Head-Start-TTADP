import { QueryTypes } from 'sequelize';
import { sequelize } from '../models'; // Ensure this path is correct
import { auditLogger } from '../logger';

// Define the structure for maximum ID records
interface MaxIdRecord {
  table_name: string;
  max_id: number;
}

// Fetch the maximum IDs from the audit tables
const fetchMaxIds = async (): Promise<MaxIdRecord[]> => sequelize.query<MaxIdRecord>(/* sql */ `
  SELECT
      cls.relname AS table_name,
      seq_data.last_value AS max_id
  FROM pg_class seq
  JOIN pg_depend dep ON dep.objid = seq.oid
  JOIN pg_class cls ON cls.oid = dep.refobjid
  JOIN pg_attribute attr ON attr.attrelid = dep.refobjid AND attr.attnum = dep.refobjsubid
  JOIN pg_sequences seq_data ON seq_data.sequencename = seq.relname
  WHERE seq.relkind = 'S'
  AND cls.relname LIKE 'ZAL%'
  AND attr.attname = 'id'
  AND seq_data.schemaname = 'public';
`, { type: QueryTypes.SELECT });

interface ChangeRecord {
  source_table: string;
  dml_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_row_data: { [key: string]: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_row_data: { [key: string]: any };
  dml_timestamp: Date;
  data_id: number;
}

// Fetch and aggregate changes from all audit tables based on fetched max IDs
const fetchAndAggregateChanges = async (maxIds: MaxIdRecord[]): Promise<ChangeRecord[]> => {
  const allChanges: ChangeRecord[] = await Promise.all(maxIds.flatMap(async ({
    table_name,
    max_id,
  }) => sequelize.query<ChangeRecord>(/* sql */ `
    SELECT *, '${table_name}' AS source_table
    FROM "${table_name}"
    WHERE data_id > ${max_id}
    ORDER BY dml_timestamp DESC
  `, { type: QueryTypes.SELECT })));

  // Sort changes in reverse chronological order to ensure correct order for reversion
  allChanges.sort((a, b) => b.dml_timestamp.getTime() - a.dml_timestamp.getTime());
  return allChanges;
};

const revertChange = async (changes: ChangeRecord[]): Promise<void> => {
  const change = changes.pop(); // Remove the last change from the array
  if (!change) {
    auditLogger.log('All changes have been successfully reverted.');
    return; // Base case: if there are no more changes, stop recursion
  }

  const tableName = change.source_table.replace('ZAL', '');
  try {
    switch (change.dml_type) {
      case 'INSERT':
        await sequelize.query(/* sql */ `
            DELETE FROM "${tableName}"
            WHERE id = ${change.data_id};
        `);
        break;
      case 'DELETE':
        const columns = Object.keys(change.old_row_data)
          .map(key => `"${key}"`)  // Add double quotes around each key
          .join(', ');  // Join them with a comma and a space
        const values = Object.values(change.old_row_data)
          .map(val => `'${val}'`)
          .join(', ');
        await sequelize.query(/* sql */ `
            INSERT INTO "${tableName}"
            (${columns})
            VALUES
            (${values});
        `);
        break;
      case 'UPDATE':
        const setClause = Object.entries(change.old_row_data)
          .map(([key, val]) => `"${key}" = '${val}'`)
          .join(', ');
        await sequelize.query(/* sql */ `
            UPDATE "${tableName}"
            SET ${setClause}
            WHERE id = ${change.data_id};
        `);
        break;
      default:
        throw new Error(`Unknown dml_type(${change.dml_type}) for table: ${tableName}`);
    }
    // Recursively call revertChange to process the next change
    await revertChange(changes);
  } catch (err) {
    auditLogger.error('Error during reversion of a change:', err);
    throw err; // Rethrow the error to exit the recursion and handle it in the caller
  }
};

// Revert all changes based on the aggregated change records
const revertAllChanges = async (maxIds: MaxIdRecord[]): Promise<void> => {
  try {
    const allChanges = await fetchAndAggregateChanges(maxIds);
    await revertChange([...allChanges]); // Clone the array if original should be preserved
  } catch (err) {
    auditLogger.error('Error during reversion:', err);
    throw err; // Transaction is automatically rolled back on error
  }
};

const captureSnapshot = async (): Promise<MaxIdRecord[]> => fetchMaxIds();
const rollbackToSnapshot  = async (maxIds: MaxIdRecord[]): Promise<void> => revertAllChanges(maxIds);

export {
  MaxIdRecord,
  ChangeRecord,
  fetchMaxIds,
  fetchAndAggregateChanges,
  revertChange,
  revertAllChanges,
  captureSnapshot,
  rollbackToSnapshot,
};
