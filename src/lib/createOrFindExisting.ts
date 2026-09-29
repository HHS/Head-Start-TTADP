import { EmptyResultError, type Model, type ModelStatic, type Transaction } from 'sequelize';

/**
 * Inserts `values` with `ON CONFLICT DO NOTHING`, falling back to `findExisting` when a unique
 * constraint already holds a row for them (another request, process, or sibling won the race).
 *
 * A conflict never raises a database error, so there is no SAVEPOINT to roll back: rolling one
 * back would also silently discard any unrelated writes other code made on the same transaction
 * in the meantime. Sequelize reports the skipped insert as an EmptyResultError, raised after the
 * query succeeds and before any `afterCreate` hooks run.
 *
 * If the insert was skipped but `findExisting` finds nothing, a different unique constraint
 * caused the conflict; that is surfaced as an error rather than treated as a lost race.
 */
export default async function createOrFindExisting<M extends Model>(
  model: ModelStatic<M>,
  values: Record<string, unknown>,
  findExisting: () => Promise<M | null>,
  transaction?: Transaction | null
): Promise<{ record: M; created: boolean }> {
  try {
    const record = await model.create(values as M['_creationAttributes'], {
      transaction,
      ignoreDuplicates: true,
    });
    return { record, created: true };
  } catch (error) {
    if (!(error instanceof EmptyResultError)) throw error;
  }

  const record = await findExisting();
  if (!record) {
    throw new Error(
      `${model.name}: insert skipped by a conflicting unique constraint, but no matching row was found`
    );
  }
  return { record, created: false };
}
