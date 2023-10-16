import { Op } from 'sequelize';
import { sequelize } from '../../models';

// TODO: for some reason the query generated is making each of the numbers a string
const numericFilter = (
  isIncluded: boolean,
  tableAlias: string,
  column: string,
  values: number[],
) => sequelize.where(
  sequelize.col(`"${tableAlias}"."${column}"`),
  {
    ...(
      isIncluded
        ? { [Op.in]: values }
        : { [Op.notIn]: values }
    ),
  },
);

const filterNumerics = (
  tableAlias: string,
  column: string,
) => ({
  in: (query) => numericFilter(
    true,
    tableAlias,
    column,
    query,
  ),
  nin: (query) => numericFilter(
    false,
    tableAlias,
    column,
    query,
  ),
});

export {
  numericFilter,
  filterNumerics,
};
