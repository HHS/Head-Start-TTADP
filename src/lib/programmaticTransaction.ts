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
      COALESCE(seq_data.last_value, 0) AS max_id
  FROM pg_class seq
  JOIN pg_depend dep ON dep.objid = seq.oid
  JOIN pg_class cls ON cls.oid = dep.refobjid
  JOIN pg_attribute attr ON attr.attrelid = dep.refobjid AND attr.attnum = dep.refobjsubid
  JOIN pg_sequences seq_data ON seq_data.sequencename = seq.relname
  WHERE seq.relkind = 'S'
  AND cls.relname LIKE 'ZAL%'
  AND cls.relname != 'ZALDDL'
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

const revertChange = async (changes: ChangeRecord[]): Promise<void> => {
  const change = changes.shift();
  if (!change) {
    auditLogger.log('info', 'All changes have been successfully reverted.');
    return; // Base case: if there are no more changes, stop recursion
  }
  const tableName = change.source_table.replace('ZAL', '');
  try {
    // auditLogger.log('info', JSON.stringify({ tableName, ...change }));
    switch (change.dml_type) {
      case 'INSERT':
        // Use parameterized query to safely delete
        await sequelize.query(/* sql */ `
          DELETE FROM "${tableName}"
          WHERE id = :id;
        `, { replacements: { id: change.data_id } });
        break;
      case 'DELETE':
        // Insert with parameterized query
        {
          const columns = Object.keys(change.old_row_data)
            .map((key) => `"${key}"`)
            .join(', ');

          const replacements = Object.entries(change.old_row_data).reduce(
            (acc, [key, value]) => {
              let parsedValue;

              // Try to parse the value as JSON
              try {
                parsedValue = JSON.parse(value);
              } catch (error) {
                parsedValue = value; // If parsing fails, use the original value
              }

              return {
                ...acc,
                [key]: Array.isArray(parsedValue)
                  ? `{${parsedValue.map((v) => `"${v}"`).join(',')}}`
                  : parsedValue,
              };
            },
            { id: change.data_id },
          );

          await sequelize.query(/* sql */ `
            INSERT INTO "${tableName}" (${columns})
            VALUES (${Object.keys(replacements).map((key) => `:${key}`).join(', ')});
          `, { replacements });
        }
        break;
      case 'UPDATE':
        // Update with parameterized query
        {
          const setClause = Object.keys(change.old_row_data)
            .map((key) => `"${key}" = :${key}`)
            .join(', ');

          const replacements = Object.entries(change.old_row_data).reduce(
            (acc, [key, value]) => {
              let parsedValue;

              // Try to parse the value as JSON
              try {
                parsedValue = JSON.parse(value);
              } catch (error) {
                parsedValue = value; // If parsing fails, use the original value
              }

              return {
                ...acc,
                [key]: Array.isArray(parsedValue)
                  ? `{${parsedValue.map((v) => `"${v}"`).join(',')}}`
                  : parsedValue,
              };
            },
            { id: change.data_id },
          );

          await sequelize.query(/* sql */ `
            UPDATE "${tableName}"
            SET ${setClause}
            WHERE id = :id;
          `, { replacements });
        }
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
  if (process.env.NODE_ENV === 'production') {
    auditLogger.error('Attempt to revert changes in production environment');
    throw new Error('Revert operations are not allowed in production environment');
  }
  try {
    const allChanges = await fetchAndAggregateChanges(maxIds);
    sequelize.query(`DO $$ BEGIN RAISE WARNING  '${JSON.stringify(allChanges)}'; END $$;`);
    await revertChange(allChanges);
  } catch (err) {
    auditLogger.error('Error during reversion:', err);
    throw err;
  }
};

const captureSnapshot = async (): Promise<MaxIdRecord[]> => fetchMaxIds();
const rollbackToSnapshot = async (maxIds: MaxIdRecord[]): Promise<void> => revertAllChanges(maxIds);

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
