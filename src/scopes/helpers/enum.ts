import { Op } from 'sequelize';
import { sequelize } from '../../models';

const enumFilter = (
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
  in: (query) => enumFilter(true, tableAlias, column, query),
  nin: (query) => enumFilter(false, tableAlias, column, query),
});

export {
  enumFilter,
  filterEnums,
};
