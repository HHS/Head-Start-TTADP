import { Op } from 'sequelize';
import { sequelize } from '../../models';

const singleValueTextFilter = (
  isIncluded: boolean,
  tableAlias: string,
  column: string,
  values: string[],
) => sequelize.where(
  sequelize.col(`"${tableAlias}"."${column}"`),
  {
    ...(
      isIncluded
        ? { [Op.iRegexp]: values.join('|') }
        : { [Op.notIRegexp]: values.join('|') }
    ),
  },
);

const filterEnums = (
  tableAlias: string,
  column: string,
) => ({
  in: (query) => singleValueTextFilter(true, tableAlias, column, query),
  nin: (query) => singleValueTextFilter(false, tableAlias, column, query),
});

export {
  singleValueTextFilter,
  filterEnums,
};
