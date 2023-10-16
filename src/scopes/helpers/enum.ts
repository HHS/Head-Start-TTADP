import { numericFilter } from './numeric';
import { singleValueTextFilter } from './text';

const tableEnumFilter = (
  isIncluded: boolean,
  tableAlias: string,
  values: (string | number)[],
): object => {
  const typeCounts = values.reduce((acc, value) => {
    // eslint-disable-next-line no-plusplus
    acc[typeof value]++;
    return acc;
  }, { number: 0, string: 0 });

  if (typeCounts.string === values.length) {
    // TODO: this wont return valid results, the function needs to be a sub query matching to the
    // ids from the "enum" table
    return singleValueTextFilter(isIncluded, tableAlias, 'name', values as string[]);
  }

  if (typeCounts.number === values.length) {
    return numericFilter(isIncluded, tableAlias, 'id', values as number[]);
  }

  throw new Error('Mixed values are not supported. Values must be all strings or all numbers.');
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

// This function creates a filter object for table enums.
// The filter object has two properties: "in" and "nin".
// The "in" property is a function that calls the "tableEnumFilter" function
// with the "true" argument.
// The "nin" property is a function that calls the "tableEnumFilter" function
// with the "false" argument.
const filterTableEnums = (
  tableAlias: string,
) => ({
  // Function that filters values that are included in the query
  in: (query) => tableEnumFilter(true, tableAlias, query),
  // Function that filters values that are not included in the query
  nin: (query) => tableEnumFilter(false, tableAlias, query),
});

// This function creates a filter object for value enums.
// The filter object has two properties: "in" and "nin".
// The "in" property is a function that calls the "valueEnumFilter" function
// with the "true" argument.
// The "nin" property is a function that calls the "valueEnumFilter" function
// with the "false" argument.
const filterValueEnums = (
  tableAlias: string,
  column: string,
) => ({
  // Function that filters values that are included in the query
  in: (query) => valueEnumFilter(true, tableAlias, column, query),
  // Function that filters values that are not included in the query
  nin: (query) => valueEnumFilter(false, tableAlias, column, query),
});

export {
  tableEnumFilter as enumFilter,
  valueEnumFilter,
  filterTableEnums,
  filterValueEnums,
};
