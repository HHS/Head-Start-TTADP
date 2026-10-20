import { type Model, type ModelStatic, Op, type WhereOptions } from 'sequelize';

/**
 * Makes a parent's rows in a join table match `childIds`: creates the rows that are missing and
 * destroys the ones no longer listed. An empty list destroys them all.
 *
 * `parent` names the parent's foreign key and id, e.g. `{ ttaRequestId: 1 }`.
 *
 * Only the join rows are touched; checking that the parent may have these children is the
 * caller's job.
 */
export default async function syncJoinRows(
  model: ModelStatic<Model>,
  parent: Record<string, number>,
  childKey: string,
  childIds: (number | string)[]
): Promise<void> {
  const ids = [...new Set(childIds)];

  const existing = await model.findAll({
    attributes: [childKey],
    where: parent as WhereOptions,
  });
  const existingIds = existing.map((row) => row.get(childKey));

  await model.bulkCreate(
    ids.filter((id) => !existingIds.includes(id)).map((id) => ({ ...parent, [childKey]: id }))
  );
  // Sequelize drops an empty NOT IN from the query, so an empty list clears every row
  await model.destroy({
    where: { ...parent, [childKey]: { [Op.notIn]: ids } } as WhereOptions,
  });
}
