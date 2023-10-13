import { numericFilter } from './numeric';
import { singleValueTextFilter } from './text';

const tableEnumFilter = (
  isIncluded: boolean,
  tableAlias: string,
  values: string[] | number[],
) => {
  const isAllStrings = values.every((item) => typeof item === 'string');
  const isAllNumbers = values.every((item) => typeof item === 'number');

  if (isAllStrings) {
    return singleValueTextFilter(isIncluded, tableAlias, 'name', values as string[]);
  }
  if (isAllNumbers) {
    return numericFilter(isIncluded, tableAlias, 'id', values as number[]);
  }

  throw new Error('Mixed values are not supported');
};

const valueEnumFilter = (
  isIncluded: boolean,
  tableAlias: string,
  column: string,
  values: string[],
) => singleValueTextFilter(
  isIncluded,
  tableAlias,
  column,
  values,
);

const filterTableEnums = (
  tableAlias: string,
) => ({
  in: (query) => tableEnumFilter(true, tableAlias, query),
  nin: (query) => tableEnumFilter(false, tableAlias, query),
});

const filterValueEnums = (
  tableAlias: string,
  column: string,
) => ({
  in: (query) => valueEnumFilter(true, tableAlias, column, query),
  nin: (query) => valueEnumFilter(false, tableAlias, column, query),
});

export {
  tableEnumFilter as enumFilter,
  valueEnumFilter,
  filterTableEnums,
  filterValueEnums,
};
